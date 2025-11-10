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
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Volcengine API configuration
const VOLCENGINE_API_ENDPOINT = process.env.VOLCENGINE_API_ENDPOINT || "https://ark.cn-beijing.volces.com/api/v3";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;
const MODEL_NAME = "doubao-seedream-4-0-250828";

// Validate API Key is configured
if (!VOLCENGINE_API_KEY || VOLCENGINE_API_KEY.includes("your_volcengine_api_key")) {
  console.error("\n❌ Error: VOLCENGINE_API_KEY is not properly configured!");
  console.error("\nPlease set your Volcengine API key in the MCP configuration:");
  console.error("1. Get your API key from Volcengine Console");
  console.error("2. Add it to your MCP client configuration file");
  console.error("3. Restart your MCP client");
  console.error("\nExample configuration:");
  console.error(JSON.stringify({
    mcpServers: {
      seedream: {
        command: "node",
        args: ["path/to/build/index.js"],
        env: {
          VOLCENGINE_API_KEY: "your_actual_api_key_here"
        }
      }
    }
  }, null, 2));
  process.exit(1);
}

interface GenerateImageArgs {
  prompt: string;
  aspect_ratio?: string;
  size?: string;
  width?: number;
  height?: number;
  guidance_scale?: number;
  seed?: number;
  num_images?: number;
  output_directory?: string;
  reference_images?: string[];
  filename?: string;
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

// Download image from URL and save to disk
async function downloadImage(url: string, outputPath: string): Promise<void> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000, // 1 minute timeout
  });
  
  await fs.promises.writeFile(outputPath, response.data);
}

// Get default output directory (temp directory with seedream subfolder)
function getDefaultOutputDirectory(): string {
  const tempDir = os.tmpdir();
  const seedreamDir = path.join(tempDir, 'seedream-images');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(seedreamDir)) {
    fs.mkdirSync(seedreamDir, { recursive: true });
  }
  
  return seedreamDir;
}

// Process reference images - convert local paths to base64, keep URLs as is
async function processReferenceImages(images: string[]): Promise<string[]> {
  const processedImages: string[] = [];

  for (const img of images) {
    // Check if it's a URL
    if (img.startsWith('http://') || img.startsWith('https://')) {
      processedImages.push(img);
    } else {
      // It's a local file path - convert to base64
      try {
        // Resolve path (support both absolute and relative paths)
        const resolvedPath = path.isAbsolute(img) ? img : path.resolve(process.cwd(), img);
        
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`Image file not found: ${resolvedPath}`);
        }

        const imageBuffer = await fs.promises.readFile(resolvedPath);
        const base64Image = imageBuffer.toString('base64');
        
        // Detect MIME type based on file extension
        const ext = path.extname(resolvedPath).toLowerCase();
        let mimeType = 'image/jpeg'; // default
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';
        
        // Format as data URL
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        processedImages.push(dataUrl);
        
        console.log(`  ✓ Loaded local image: ${resolvedPath}`);
      } catch (error) {
        throw new Error(`Failed to process image "${img}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return processedImages;
}

// Generate image using Volcengine API
async function generateImage(args: GenerateImageArgs): Promise<string> {

  const {
    prompt,
    aspect_ratio = "16:9",
    size = "regular",
    width,
    height,
    guidance_scale = 2.5,
    seed,
    num_images = 1,
    output_directory,
    reference_images,
    filename,
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

  console.log(`\n🎨 Generating ${num_images} image(s) with SeedDream 4.0...`);
  console.log(`📝 Prompt: "${prompt}"`);
  console.log(`📐 Size: ${sizeString}`);
  console.log(`🎯 Guidance Scale: ${guidance_scale}`);
  if (seed) {
    console.log(`🌱 Seed: ${seed}`);
  }

  // Process reference images if provided
  let processedReferenceImages: string[] | undefined;
  if (reference_images) {
    console.log(`\n🖼️  Processing reference images...`);
    processedReferenceImages = await processReferenceImages(reference_images);
    console.log(`✓ Processed ${processedReferenceImages.length} reference image(s)`);
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

    // Add reference images if provided
    if (processedReferenceImages && processedReferenceImages.length > 0) {
      requestBody.image = processedReferenceImages;
    }

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

    // Download images if output_directory is specified
    let savedPaths: string[] = [];
    if (output_directory !== undefined && output_directory !== null) {
      const targetDir = output_directory || getDefaultOutputDirectory();
      
      // Ensure output directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      console.log(`\n💾 Downloading images to: ${targetDir}`);
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const timestamp = Date.now();
        // Use provided filename or default to seedream_{timestamp}_{index}.png
        let finalFilename: string;
        if (filename) {
          // If custom filename is provided and multiple images, append index
          if (num_images > 1) {
            const ext = path.extname(filename) || '.png';
            const basename = path.basename(filename, ext);
            finalFilename = `${basename}_${i + 1}${ext}`;
          } else {
            finalFilename = filename;
          }
        } else {
          // Default filename pattern
          finalFilename = `seedream_${timestamp}_${i + 1}.png`;
        }
        const filepath = path.join(targetDir, finalFilename);
        
        try {
          await downloadImage(img.url, filepath);
          savedPaths.push(filepath);
          console.log(`  ✓ Saved image ${i + 1} to: ${filepath}`);
        } catch (error) {
          console.error(`  ✗ Failed to download image ${i + 1}: ${error}`);
        }
      }
    }

    // Format response
    let result = `✅ Successfully generated ${images.length} image(s) using SeedDream 4.0:\n\n`;
    result += `📝 Prompt: "${prompt}"\n`;
    result += `📐 Aspect Ratio: ${aspect_ratio}\n`;
    result += `📏 Size: ${sizeString}\n`;
    result += `🎯 Guidance Scale: ${guidance_scale}\n`;
    if (seed) {
      result += `🌱 Seed: ${seed}\n`;
    }
    if (processedReferenceImages && processedReferenceImages.length > 0) {
      result += `🖼️  Reference Images: ${processedReferenceImages.length}\n`;
    }
    result += `\n🖼️  Generated Images:\n`;

    images.forEach((img, index) => {
      result += `\nImage ${index + 1}:\n`;
      if (savedPaths[index]) {
        result += `  Saved to: ${savedPaths[index]}\n`;
      } else {
        result += `  URL: ${img.url}\n`;
      }
      if (img.revised_prompt) {
        result += `  Revised Prompt: ${img.revised_prompt}\n`;
      }
    });

    console.log(`✅ Generation complete!`);

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
    version: "0.2.0",
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
          "Generate images using SeedDream 4.0 via Volcengine API. Supports both text-to-image (txt2img) and image-to-image (img2img) generation. " +
          "For img2img: provide source images via 'reference_images' parameter - the AI will use them as VISUAL INPUT to guide generation. " +
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
            output_directory: {
              type: "string",
              description: "Directory to save generated images. If not specified, images will only be returned as URLs. If set to empty string or null, images will be saved to a default temporary directory",
            },
            reference_images: {
              type: "array",
              description: "🎨 INPUT IMAGE(S) for image-to-image generation (img2img). Provide source image(s) that will be used as visual input to guide the generation. Supports: URL (http/https) or local file path. Local images are auto-converted to base64. Use this to enhance, transform, or create variations of existing images.",
              items: {
                type: "string",
              },
            },
            filename: {
              type: "string",
              description: "Custom filename for saved images (default: seedream_{timestamp}_{index}.png). For multiple images, index will be automatically appended.",
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
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await server.close();
  process.exit(0);
});

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

