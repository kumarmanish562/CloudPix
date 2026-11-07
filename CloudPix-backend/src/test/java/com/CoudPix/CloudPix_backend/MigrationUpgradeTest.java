package com.CoudPix.CloudPix_backend;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import java.sql.*;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class MigrationUpgradeTest {
    @Test
    void upgradesExistingV2DataDeduplicatesMembershipAndCascadesSafely() throws Exception {
        String url = System.getenv().getOrDefault("TEST_DB_URL", "jdbc:h2:mem:migration_upgrade;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        String username = System.getenv().getOrDefault("TEST_DB_USERNAME", "sa");
        String password = System.getenv().getOrDefault("TEST_DB_PASSWORD", "");
        String schema = "migration_" + UUID.randomUUID().toString().replace("-", "");
        var before = Flyway.configure().dataSource(url, username, password).schemas(schema).defaultSchema(schema).target("2").load();
        before.migrate();
        String user = UUID.randomUUID().toString(), photo = UUID.randomUUID().toString(), album = UUID.randomUUID().toString();
        try (Connection connection = DriverManager.getConnection(url, username, password)) {
            connection.setSchema(schema);
            try (Statement sql = connection.createStatement()) {
                sql.executeUpdate("insert into users (id, email, password_hash, display_name) values ('" + user + "', 'migration@example.com', 'hash', 'Migration')");
                sql.executeUpdate("insert into photos (id, user_id, imagekit_file_id, file_name, url) values ('" + photo + "', '" + user + "', 'file', 'photo.png', 'https://ik.imagekit.io/test/photo.png')");
                sql.executeUpdate("insert into albums (id, user_id, title, cover_photo_id) values ('" + album + "', '" + user + "', 'Album', '" + photo + "')");
                for (int i = 0; i < 2; i++)
                    sql.executeUpdate("insert into album_photos (id, album_id, photo_id) values ('" + UUID.randomUUID() + "', '" + album + "', '" + photo + "')");
            }
        }
        Flyway.configure().dataSource(url, username, password).schemas(schema).defaultSchema(schema).load().migrate();
        try (Connection connection = DriverManager.getConnection(url, username, password)) {
            connection.setSchema(schema);
            try (Statement sql = connection.createStatement()) {
                assertEquals(1, count(sql, "album_photos"));
                assertThrows(SQLException.class, () -> sql.executeUpdate("insert into album_photos (id, album_id, photo_id) values ('" + UUID.randomUUID() + "', '" + album + "', '" + photo + "')"));
                sql.executeUpdate("insert into photo_tags (photo_id, tag) values ('" + photo + "', 'travel')");
                sql.executeUpdate("insert into album_shares (id, album_id, token_hash, expires_at) values ('" + UUID.randomUUID() + "', '" + album + "', '" + "a".repeat(64) + "', CURRENT_TIMESTAMP)");
                sql.executeUpdate("delete from photos where id = '" + photo + "'");
                assertEquals(0, count(sql, "album_photos"));
                assertEquals(0, count(sql, "photo_tags"));
                try (ResultSet cover = sql.executeQuery("select cover_photo_id from albums")) {
                    assertTrue(cover.next()); assertNull(cover.getObject(1));
                }
                sql.executeUpdate("delete from albums");
                assertEquals(0, count(sql, "album_shares"));
                try (ResultSet rs = sql.executeQuery("select email_verified from users where id = '" + user + "'")) {
                    assertTrue(rs.next());
                    assertFalse(rs.getBoolean(1));
                }
            }
        } finally {
            // This test owns a unique schema, including its Flyway history.
            try (Connection connection = DriverManager.getConnection(url, username, password);
                 Statement sql = connection.createStatement()) { sql.execute("drop schema " + schema + " cascade"); }
        }
    }
    private long count(Statement sql, String table) throws SQLException {
        try (ResultSet result = sql.executeQuery("select count(*) from " + table)) { result.next(); return result.getLong(1); }
    }
}

