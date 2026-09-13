/*
  Warnings:

  - You are about to drop the column `estado` on the `registros_calidad` table. All the data in the column will be lost.
  - You are about to drop the column `observaciones` on the `registros_calidad` table. All the data in the column will be lost.
  - You are about to drop the column `parametro` on the `registros_calidad` table. All the data in the column will be lost.
  - You are about to drop the column `unidad` on the `registros_calidad` table. All the data in the column will be lost.
  - You are about to drop the column `valor` on the `registros_calidad` table. All the data in the column will be lost.
  - Added the required column `conductividad` to the `registros_calidad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lote` to the `registros_calidad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operador` to the `registros_calidad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ph` to the `registros_calidad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tds` to the `registros_calidad` table without a default value. This is not possible if the table is not empty.
  - Added the required column `turbiedad` to the `registros_calidad` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "registros_calidad" DROP COLUMN "estado",
DROP COLUMN "observaciones",
DROP COLUMN "parametro",
DROP COLUMN "unidad",
DROP COLUMN "valor",
ADD COLUMN     "conductividad" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lote" TEXT NOT NULL,
ADD COLUMN     "operador" TEXT NOT NULL,
ADD COLUMN     "ph" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "tds" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "turbiedad" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "fecha" DROP DEFAULT;

-- DropEnum
DROP TYPE "EstadoCalidad";
