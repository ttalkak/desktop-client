export interface ResponseDto<DataDto> {
  success: boolean;
  message: string;
  status: number;
  data: DataDto;
}
