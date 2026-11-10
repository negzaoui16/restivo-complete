#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/60c889555850511ad3b57db3f84aab124f850dd4db5595fd81bdf09f41da31be/contract';
import endContract from '../../snapshots/60c889555850511ad3b57db3f84aab124f850dd4db5595fd81bdf09f41da31be/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6f4f5f79cbb2e5878045829a6aef3cdec3b443617e7b5322f93f2e8b900eeeb5/contract';
import startContract from '../../snapshots/6f4f5f79cbb2e5878045829a6aef3cdec3b443617e7b5322f93f2e8b900eeeb5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Favorite',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('restaurantId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Restaurant',
        column: col('cuisine', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Restaurant',
        column: col('priceLevel', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      // Hand-written instead of this.setDefault(): the planned operation's postcheck only asks
      // "does the column have a default?", which the old EUR default already satisfies, so the
      // runner treats it as done and never runs the ALTER. This one checks for TND.
      rawSql({
        id: 'setDefault.Restaurant.currency',
        label: 'Set default on "Restaurant"."currency"',
        operationClass: 'widening',
        target: { id: 'postgres', details: { schema: 'public', objectType: 'column', name: 'currency', table: 'Restaurant' } },
        precheck: [
          {
            description: 'ensure column "currency" exists',
            sql: 'SELECT EXISTS (SELECT 1 AS "one" FROM "information_schema"."columns" WHERE ("table_schema" = $1 AND "table_name" = $2 AND "column_name" = $3)) AS "result"',
            params: ['public', 'Restaurant', 'currency'],
          },
        ],
        execute: [
          {
            description: 'set default on "currency"',
            sql: `ALTER TABLE "public"."Restaurant" ALTER COLUMN "currency" SET DEFAULT 'TND'`,
          },
        ],
        postcheck: [
          {
            description: 'verify the default of "currency" is TND',
            sql: `SELECT EXISTS (SELECT 1 AS "one" FROM "information_schema"."columns" WHERE ("table_schema" = $1 AND "table_name" = $2 AND "column_name" = $3 AND "column_default" LIKE '%TND%')) AS "result"`,
            params: ['public', 'Restaurant', 'currency'],
          },
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Favorite',
        constraint: 'Favorite_userId_restaurantId_key',
        columns: ['userId', 'restaurantId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Restaurant',
        constraint: 'price_level_range_6639a0cb',
        expression: '"priceLevel" IS NULL OR "priceLevel" BETWEEN 1 AND 4',
      }),
      this.createIndex({
        schema: 'public',
        table: 'Favorite',
        index: 'Favorite_restaurantId_idx_cf3ee7d0',
        columns: ['restaurantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Favorite',
        index: 'Favorite_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Favorite',
        foreignKey: {
          name: 'Favorite_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Favorite',
        foreignKey: {
          name: 'Favorite_restaurantId_fkey',
          columns: ['restaurantId'],
          references: { schema: 'public', table: 'Restaurant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
