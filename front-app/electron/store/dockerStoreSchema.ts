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
        properties: {
          Containers: { type: "number" },
          Created: { type: "number" },
          Id: { type: "string" },
          Labels: { type: "object", additionalProperties: { type: "string" } },
          ParentId: { type: "string" },
          RepoDigests: { type: "array", items: { type: "string" } },
          RepoTags: { type: "array", items: { type: "string" } },
          SharedSize: { type: "number" },
          Size: { type: "number" },
        },
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
        properties: {
          Id: { type: "string" },
          Names: { type: "array", items: { type: "string" } },
          Image: { type: "string" },
          ImageID: { type: "string" },
          Command: { type: "string" },
          Created: { type: "number" },
          Ports: {
            type: "array",
            items: {
              type: "object",
              properties: {
                IP: { type: "string" },
                PrivatePort: { type: "number" },
                PublicPort: { type: "number" },
                Type: { type: "string" },
              },
            },
          },
          State: { type: "string" },
          Status: { type: "string" },
        },
        required: ["Id", "Image", "State"],
        additionalProperties: true,
      },
    },
    default: {},
  },
};
