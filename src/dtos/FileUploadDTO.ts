import { IsNumber, Max, IsString, Matches } from "class-validator";

export class FileUploadDTO {
  @IsString()
  @Matches(/^image\/(jpg|jpeg|png|gif)$/, {
    message: "Invalid file type. Allowed types: jpg, jpeg, png, gif",
  })
  mimetype: string;

  @IsNumber()
  @Max(5 * 1024 * 1024, {
    // 5MB in bytes
    message: "File size cannot exceed 5MB",
  })
  size: number;

  @IsString()
  @Matches(/\.(jpg|jpeg|png|gif)$/, {
    message: "Invalid file extension. Allowed extensions: jpg, jpeg, png, gif",
  })
  originalname: string;
}
