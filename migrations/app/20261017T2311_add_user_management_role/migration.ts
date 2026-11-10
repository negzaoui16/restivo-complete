#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/08e8c9f9863f4ea9487170a695bd28654048ded29da586908431d815ee015c24/contract';
import startContract from '../../snapshots/08e8c9f9863f4ea9487170a695bd28654048ded29da586908431d815ee015c24/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6f4f5f79cbb2e5878045829a6aef3cdec3b443617e7b5322f93f2e8b900eeeb5/contract';
import endContract from '../../snapshots/6f4f5f79cbb2e5878045829a6aef3cdec3b443617e7b5322f93f2e8b900eeeb5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('managementRole', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_managementRole_check_4a97af3b',
        expression: "\"managementRole\" IN ('OWNER', 'MANAGER', 'STAFF')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_managementRole_idx_5c6a53b9',
        columns: ['managementRole'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
