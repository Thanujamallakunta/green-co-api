/**
 * Type declaration for optional dependency 'exceljs'.
 * Install with: npm install exceljs
 */
declare module 'exceljs' {
  export class Workbook {
    addWorksheet(name: string, options?: { headerFooter?: { firstHeader?: string } }): Worksheet;
    xlsx: { writeBuffer(): Promise<Buffer>; load(buffer: Buffer): Promise<void> };
    worksheets: Worksheet[];
  }
  export interface Worksheet {
    columns?: { header: string; key: string; width: number }[];
    addRows(rows: any[]): void;
    getRow(row: number): Row;
    rowCount: number;
  }
  export interface Row {
    eachCell(callback: (cell: { value?: any }, colNumber: number) => void): void;
  }
}
