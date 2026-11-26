# Backup and Restore

Use PostgreSQL-native backups. For local Compose, a logical backup can be made with:

```sh
docker compose exec -T database pg_dump -U forma -Fc forma > forma.dump
```

Restore into a separately created target database after verifying the backup and target identity:

```sh
docker compose exec -T database pg_restore -U forma -d forma_restore --clean --if-exists < forma.dump
```

Production backup encryption, retention, offsite replication, and restore-time objectives depend on the hosting provider and are not configured by this repository. Do not put database dumps in the source tree or container image.
