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
  size?: string;
  guidance_scale?: number;
  seed?: number;
  num_images?: number;
  output_directory?: string;
  reference_images?: string[];
  filename?: string;
}

interface BatchGenerateImageArgs {
  tasks: GenerateImageArgs[];
  max_concurrent?: number;
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
    size = "2K",
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

  console.log(`\n🎨 Generating ${num_images} image(s) with SeedDream 4.0...`);
  console.log(`📝 Prompt: "${prompt}"`);
  console.log(`📐 Size: ${size}`);
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

    const sequential_image_generation = num_images > 1 ? "auto" : "disabled";

    try {
    const requestBody: any = {
      model: MODEL_NAME,
      prompt,
      size: size,
      sequential_image_generation: sequential_image_generation,
      stream: false,
      response_format: "url",
      watermark: false,
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
            // For single image, ensure filename has .png extension if no extension provided
            const ext = path.extname(filename);
            finalFilename = ext ? filename : `${filename}.png`;
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
    result += `📏 Size: ${size}\n`;
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

// Batch generate images with concurrency control
async function batchGenerateImages(args: BatchGenerateImageArgs): Promise<string> {
  const { tasks, max_concurrent = 3 } = args;

  if (!tasks || tasks.length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "tasks array is required and must not be empty"
    );
  }

  if (tasks.length > 20) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Maximum 20 tasks allowed per batch"
    );
  }

  console.log(`\n🚀 Starting batch generation: ${tasks.length} task(s), max ${max_concurrent} concurrent`);

  // Function to run tasks with concurrency limit
  const runWithConcurrency = async (
    tasks: GenerateImageArgs[],
    limit: number
  ): Promise<Array<{ success: boolean; result?: string; error?: string; taskIndex: number }>> => {
    const results: Array<{ success: boolean; result?: string; error?: string; taskIndex: number }> = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskIndex = i;

      const promise = (async () => {
        try {
          console.log(`\n[Task ${taskIndex + 1}/${tasks.length}] Starting...`);
          const result = await generateImage(task);
          results.push({ success: true, result, taskIndex });
          console.log(`[Task ${taskIndex + 1}/${tasks.length}] ✅ Completed`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          results.push({ success: false, error: errorMsg, taskIndex });
          console.error(`[Task ${taskIndex + 1}/${tasks.length}] ❌ Failed: ${errorMsg}`);
        }
      })();

      executing.push(promise);

      if (executing.length >= limit) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results.sort((a, b) => a.taskIndex - b.taskIndex);
  };

  try {
    const results = await runWithConcurrency(tasks, max_concurrent);

    // Format response
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    let response = `\n${'='.repeat(60)}\n`;
    response += `📊 Batch Generation Summary\n`;
    response += `${'='.repeat(60)}\n\n`;
    response += `Total Tasks: ${tasks.length}\n`;
    response += `✅ Successful: ${successCount}\n`;
    response += `❌ Failed: ${failCount}\n`;
    response += `⚡ Max Concurrent: ${max_concurrent}\n`;
    response += `\n${'='.repeat(60)}\n`;

    results.forEach((result, index) => {
      response += `\n[Task ${index + 1}]\n`;
      response += `${'-'.repeat(60)}\n`;
      
      if (result.success) {
        response += result.result + '\n';
      } else {
        response += `❌ Error: ${result.error}\n`;
      }
    });

    response += `\n${'='.repeat(60)}\n`;
    response += `✅ Batch generation completed!\n`;
    response += `${'='.repeat(60)}\n`;

    return response;
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Batch generation failed: ${error instanceof Error ? error.message : String(error)}`
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
            size: {
              type: "string",
              description:
                "Image size specification. Supports: '1K', '2K', '4K' (default: '2K')",
              default: "2K",
            },
            guidance_scale: {
              type: "number",
              description: "Prompt adherence strength, higher values follow prompt more literally (2.0-3.0, default: 2.5)",
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
              description: "Directory to save generated images (MUST be absolute path). If not specified, images will only be returned as URLs. If set to empty string or null, images will be saved to a default temporary directory",
            },
            reference_images: {
              type: "array",
              description: "🎨 INPUT IMAGE(S) for image-to-image generation. Provide source image(s) that will be used as visual input to guide the generation. Supports: URL (http/https) or local file path (MUST be absolute path). Local images are auto-converted to base64. Use this to enhance, transform, or create variations of existing images.",
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
      {
        name: "batch_generate_images",
        description:
          "Batch generate multiple images concurrently using SeedDream 4.0. " +
          "This tool allows you to generate multiple different images in parallel with controlled concurrency. " +
          "Each task can have different prompts, settings, and parameters. " +
          "Perfect for generating multiple variations, scenes, or concepts efficiently.",
        inputSchema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              description: "Array of image generation tasks to execute concurrently. Each task has the same parameters as generate_image tool.",
              items: {
                type: "object",
                properties: {
                  prompt: {
                    type: "string",
                    description: "Text description of the image to generate",
                  },
                  size: {
                    type: "string",
                    description: "Image size: '1K', '2K', '4K'. Default: '2K'",
                  },
                  guidance_scale: {
                    type: "number",
                    description: "Prompt adherence strength (1.0-10.0, default: 2.5)",
                  },
                  seed: {
                    type: "number",
                    description: "Random seed for reproducible results",
                  },
                  num_images: {
                    type: "number",
                    description: "Number of images per task (1-4, default: 1)",
                  },
                  output_directory: {
                    type: "string",
                    description: "Directory to save images (absolute path)",
                  },
                  reference_images: {
                    type: "array",
                    description: "Reference images for img2img generation",
                    items: {
                      type: "string",
                    },
                  },
                  filename: {
                    type: "string",
                    description: "Custom filename for saved images",
                  },
                },
                required: ["prompt"],
              },
            },
            max_concurrent: {
              type: "number",
              description: "Maximum number of tasks to run concurrently (1-10, default: 3). Lower values reduce API load, higher values increase speed.",
              default: 3,
            },
          },
          required: ["tasks"],
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

  if (request.params.name === "batch_generate_images") {
    const args = request.params.arguments as unknown as BatchGenerateImageArgs;

    if (!args.tasks || args.tasks.length === 0) {
      throw new McpError(ErrorCode.InvalidParams, "tasks array is required and must not be empty");
    }

    // Validate max_concurrent parameter
    if (args.max_concurrent !== undefined) {
      if (args.max_concurrent < 1 || args.max_concurrent > 10) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "max_concurrent must be between 1 and 10"
        );
      }
    }

    const result = await batchGenerateImages(args);

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

