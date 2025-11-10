#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Volcengine API configuration
const VOLCENGINE_API_ENDPOINT = process.env.VOLCENGINE_API_ENDPOINT || "https://ark.cn-beijing.volces.com/api/v3";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;
const MODEL_NAME = "doubao-seedream-4-0-250828";

interface GenerateImageArgs {
  prompt: string;
  aspect_ratio?: string;
  size?: string;
  width?: number;
  height?: number;
  guidance_scale?: number;
  seed?: number;
  num_images?: number;
}

interface ImageGenerationResponse {
  data?: Array<{
    url: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message: string;
    type: string;
  };
}

// Validate and get dimension based on size and aspect ratio
function getDimensions(
  aspectRatio: string,
  size: string,
  customWidth?: number,
  customHeight?: number
): { width: number; height: number } {
  // Custom dimensions
  if (aspectRatio === "custom") {
    if (!customWidth || !customHeight) {
      throw new Error("Width and height must be provided when aspect_ratio is 'custom'");
    }
    if (customWidth < 512 || customWidth > 2048 || customHeight < 512 || customHeight > 2048) {
      throw new Error("Width and height must be between 512 and 2048 pixels");
    }
    return { width: customWidth, height: customHeight };
  }

  // Predefined aspect ratios
  const aspectRatios: Record<string, [number, number]> = {
    "1:1": [1, 1],
    "3:4": [3, 4],
    "4:3": [4, 3],
    "16:9": [16, 9],
    "9:16": [9, 16],
    "2:3": [2, 3],
    "3:2": [3, 2],
    "21:9": [21, 9],
  };

  const ratio = aspectRatios[aspectRatio];
  if (!ratio) {
    throw new Error(`Invalid aspect ratio: ${aspectRatio}`);
  }

  const [ratioW, ratioH] = ratio;

  if (size === "small") {
    // Shortest dimension 512px
    const shortDim = 512;
    if (ratioW < ratioH) {
      return { width: shortDim, height: Math.round((shortDim * ratioH) / ratioW) };
    } else {
      return { width: Math.round((shortDim * ratioW) / ratioH), height: shortDim };
    }
  } else if (size === "big") {
    // Longest dimension 2048px
    const longDim = 2048;
    if (ratioW > ratioH) {
      return { width: longDim, height: Math.round((longDim * ratioH) / ratioW) };
    } else {
      return { width: Math.round((longDim * ratioW) / ratioH), height: longDim };
    }
  } else {
    // Regular: 1 megapixel (1024x1024 equivalent)
    const targetPixels = 1048576; // 1024 * 1024
    const width = Math.round(Math.sqrt((targetPixels * ratioW) / ratioH));
    const height = Math.round((width * ratioH) / ratioW);
    return { width, height };
  }
}

// Generate image using Volcengine API
async function generateImage(args: GenerateImageArgs): Promise<string> {
  if (!VOLCENGINE_API_KEY) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "❌ VOLCENGINE_API_KEY environment variable is not set.\n\n" +
      "Please set your Volcengine API key in the MCP configuration:\n" +
      "1. Get your API key from Volcengine Console\n" +
      "2. Add it to your MCP client configuration file\n" +
      "3. Restart your MCP client\n\n" +
      "Example configuration:\n" +
      '{\n' +
      '  "mcpServers": {\n' +
      '    "seedream": {\n' +
      '      "command": "node",\n' +
      '      "args": ["path/to/build/index.js"],\n' +
      '      "env": {\n' +
      '        "VOLCENGINE_API_KEY": "your_api_key_here"\n' +
      '      }\n' +
      '    }\n' +
      '  }\n' +
      '}'
    );
  }

  const {
    prompt,
    aspect_ratio = "16:9",
    size = "regular",
    width,
    height,
    guidance_scale = 2.5,
    seed,
    num_images = 1,
  } = args;

  // Validate guidance scale
  if (guidance_scale < 1.0 || guidance_scale > 10.0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "guidance_scale must be between 1.0 and 10.0"
    );
  }

  // Validate num_images
  if (num_images < 1 || num_images > 4) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "num_images must be between 1 and 4"
    );
  }

  // Get dimensions
  const dimensions = getDimensions(aspect_ratio, size, width, height);
  
  // Convert dimensions to size string (e.g., "1024x1024", "2048x1024")
  const sizeString = `${dimensions.width}x${dimensions.height}`;

  console.error(`\n🎨 Generating ${num_images} image(s) with SeedDream 4.0...`);
  console.error(`📝 Prompt: "${prompt}"`);
  console.error(`📐 Size: ${sizeString}`);
  console.error(`🎯 Guidance Scale: ${guidance_scale}`);
  if (seed) {
    console.error(`🌱 Seed: ${seed}`);
  }

  try {
    const requestBody: any = {
      model: MODEL_NAME,
      prompt,
      size: sizeString,
      sequential_image_generation: "disabled",
      stream: false,
      response_format: "url",
      watermark: true,
    };

    // Add optional parameters
    if (num_images && num_images > 1) {
      requestBody.n = num_images;
    }
    if (seed !== undefined) {
      requestBody.seed = seed;
    }

    const response = await axios.post<ImageGenerationResponse>(
      `${VOLCENGINE_API_ENDPOINT}/images/generations`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${VOLCENGINE_API_KEY}`,
        },
        timeout: 120000, // 2 minutes timeout
      }
    );

    if (response.data.error || !response.data.data) {
      throw new Error(response.data.error?.message || "Image generation failed");
    }

    const images = response.data.data;

    // Format response
    let result = `✅ Successfully generated ${images.length} image(s) using SeedDream 4.0:\n\n`;
    result += `📝 Prompt: "${prompt}"\n`;
    result += `📐 Aspect Ratio: ${aspect_ratio}\n`;
    result += `📏 Size: ${sizeString}\n`;
    result += `🎯 Guidance Scale: ${guidance_scale}\n`;
    if (seed) {
      result += `🌱 Seed: ${seed}\n`;
    }
    result += `\n🖼️  Generated Images:\n`;

    images.forEach((img, index) => {
      result += `\nImage ${index + 1}: ${img.url}\n`;
      if (img.revised_prompt) {
        result += `  Revised Prompt: ${img.revised_prompt}\n`;
      }
    });

    console.error(`✅ Generation complete!`);

    return result;
  } catch (error) {
    console.error(`❌ Generation failed:`, error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new McpError(
          ErrorCode.InternalError,
          `Volcengine API error: ${error.response.data?.message || error.message}`
        );
      } else if (error.request) {
        throw new McpError(
          ErrorCode.InternalError,
          "No response from Volcengine API. Please check your network connection."
        );
      }
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to generate image: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Create MCP server
const server = new Server(
  {
    name: "seedream-v4-volcengine-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_image",
        description:
          "Generate a single or multiple images from a text prompt using SeedDream 4.0 via Volcengine API. " +
          "Supports bilingual prompts (English and Chinese), multiple aspect ratios, and configurable generation parameters. " +
          "Perfect for creating high-quality images with cinematic beauty and strong instruction following.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Text description of the image to generate (supports English and Chinese)",
            },
            aspect_ratio: {
              type: "string",
              enum: ["1:1", "3:4", "4:3", "16:9", "9:16", "2:3", "3:2", "21:9", "custom"],
              description: "Image aspect ratio (default: 16:9)",
              default: "16:9",
            },
            size: {
              type: "string",
              enum: ["small", "regular", "big"],
              description:
                "Image size preset: small (shortest dim 512px), regular (1 megapixel), big (longest dim 2048px). Ignored if aspect_ratio is 'custom' (default: regular)",
              default: "regular",
            },
            width: {
              type: "number",
              description: "Image width in pixels (512-2048, only used when aspect_ratio is 'custom')",
            },
            height: {
              type: "number",
              description: "Image height in pixels (512-2048, only used when aspect_ratio is 'custom')",
            },
            guidance_scale: {
              type: "number",
              description: "Prompt adherence strength, higher values follow prompt more literally (1.0-10.0, default: 2.5)",
              default: 2.5,
            },
            seed: {
              type: "number",
              description: "Random seed for reproducible results (0-2147483647)",
            },
            num_images: {
              type: "number",
              description: "Number of images to generate (1-4, default: 1)",
              default: 1,
            },
          },
          required: ["prompt"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "generate_image") {
    const args = request.params.arguments as unknown as GenerateImageArgs;

    if (!args.prompt) {
      throw new McpError(ErrorCode.InvalidParams, "prompt is required");
    }

    const result = await generateImage(args);

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("🚀 SeedDream 4.0 Volcengine MCP server running");
  console.error("📡 Connected via stdio transport");

  if (!VOLCENGINE_API_KEY) {
    console.error("\n⚠️  WARNING: VOLCENGINE_API_KEY environment variable is not set!");
    console.error("Please configure your API key in the MCP client configuration.\n");
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.error("\n🛑 Shutting down gracefully...");
  await server.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.error("\n🛑 Shutting down gracefully...");
  await server.close();
  process.exit(0);
});

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

