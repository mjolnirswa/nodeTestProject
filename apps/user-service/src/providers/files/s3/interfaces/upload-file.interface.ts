export interface IUploadedMulterFile {
  fieldname: string;
  originalname: string;
  encoding?: string;
  mimetype?: string;
  // eslint-disable-next-line no-undef
  buffer: Buffer;
  size?: number;
}
