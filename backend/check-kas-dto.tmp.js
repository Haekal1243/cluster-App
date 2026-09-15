"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_kas_dto_1 = require("E:/Ekal/Project Rimah/cluster-App/backend/src/keuangan/dto/create-kas.dto");
async function main() {
    const inst = (0, class_transformer_1.plainToInstance)(create_kas_dto_1.CreateKasDto, {
        tipe: 'PENGELUARAN',
        kategori: 'Operasional',
        nominal: '500000',
        tanggal: new Date().toISOString(),
    });
    const errors = await (0, class_validator_1.validate)(inst);
    console.log('ERRORS:', JSON.stringify(errors.map((e) => ({ prop: e.property, cons: e.constraints }))));
    console.log('nominal type:', typeof inst.nominal);
}
main().catch((e) => console.log('FAIL:', e?.message ?? e));
//# sourceMappingURL=check-kas-dto.tmp.js.map