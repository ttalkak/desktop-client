import { Schema } from "electron-store";
export interface DockerStoreSchema {
  dockerImages: {
    [imageId: string]: DockerImage;
  };
  dockerContainers: {
    [containerId: string]: DockerContainer;
  };
}

export const schema: Schema<DockerStoreSchema> = {
  dockerImages: {
    type: "object",
    patternProperties: {
      "^.+$": {
        type: "object",
        additionalProperties: true, // 모든 속성 허용
        required: ["Id", "Created", "Size"],
      },
    },
    default: {},
  },
  dockerContainers: {
    type: "object",
    patternProperties: {
      "^.+$": {
        type: "object",
        additionalProperties: true, // 모든 속성 허용
        required: ["Id", "Image", "State"],
      },
    },
    default: {},
  },
};
