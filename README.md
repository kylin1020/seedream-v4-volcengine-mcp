# SeedDream 4.0 Volcengine MCP Server

一个基于火山引擎（Volcengine）API的文生图MCP服务器，支持使用SeedDream 4.0模型生成高质量图像。

[English](#english-version) | [中文](#中文版本)

## 中文版本

### 特性

- ✅ **高质量图像生成** - 使用SeedDream 4.0模型，具有电影般的美感
- 🌐 **双语支持** - 支持中英文提示词
- 🎨 **灵活的尺寸选项** - 支持1K、2K、4K三种尺寸规格
- ⚡ **快速生成** - 约3秒即可生成1K图像
- 🎯 **强大的指令遵循能力** - 高度还原文本描述
- 🖼️ **参考图支持** - 支持图生图功能，可输入URL或本地图片路径
- 💾 **灵活的输出选项** - 支持自定义保存路径和文件名

### 可用工具

#### `generate_image`

使用火山引擎的SeedDream 4.0模型从文本提示生成图像。

**参数：**

- `prompt` (必需): 图像的文本描述（支持中英文）。**提示：您可以在提示词中指定纵横比，例如"竖屏的城市夜景"、"9:16宽高比的景观"，模型会自动按要求生成**
- `size` (可选): 图像尺寸规格 - 可选值: `1K`, `2K`, `4K` (默认: `2K`)
- `guidance_scale` (可选): 提示词遵循强度，数值越高越严格遵循提示词 (2.0-3.0, 默认: 2.5)
- `seed` (可选): 随机种子，用于生成可复现的结果 (0-2147483647)
- `num_images` (可选): 生成图像数量 (1-4, 默认: 1)
- `output_directory` (可选): 保存生成图像的目录（必须是绝对路径）。如果不指定，图像仅作为URL返回。如果设置为空字符串或null，图像将保存到默认临时目录
- `reference_images` (可选): 参考图像，用于图生图。可以是单个图像或图像数组。每个图像可以是URL（http/https）或本地文件路径（必须是绝对路径）。本地图像会自动转换为base64
- `filename` (可选): 自定义保存的文件名（默认: seedream_{timestamp}_{index}.png）。对于多张图像，会自动添加索引

#### `batch_generate_images`

使用SeedDream 4.0并发生成多张图像。此工具允许您并行生成多个不同的图像，具有可控的并发数量。每个任务可以有不同的提示词、设置和参数。非常适合高效地生成多个变体、场景或概念。

**参数：**

- `tasks` (必需): 要并发执行的图像生成任务数组。每个任务具有与 `generate_image` 工具相同的参数：
  - `prompt` (必需): 图像的文本描述
  - `size` (可选): 图像尺寸规格 - `1K`, `2K`, `4K` (默认: `2K`)
  - `guidance_scale` (可选): 提示词遵循强度 (2.0-3.0, 默认: 2.5)
  - `seed` (可选): 随机种子 (0-2147483647)
  - `num_images` (可选): 每个任务生成的图像数量 (1-4, 默认: 1)
  - `output_directory` (可选): 保存图像的目录（绝对路径）
  - `reference_images` (可选): 参考图像数组（用于图生图）
  - `filename` (可选): 自定义文件名

- `max_concurrent` (可选): 最多并发运行的任务数 (1-10, 默认: 3)。较低的值会减少API负载，较高的值会提高速度

### 安装

#### 前置要求

1. **火山引擎API密钥**: 从火山引擎控制台获取您的API密钥
   - 在 [火山引擎控制台](https://console.volcengine.com/) 注册账号
   - 导航到API密钥管理页面生成API密钥
   - 妥善保管您的密钥，配置时需要使用

2. **Node.js**: 确保已安装Node.js（版本16或更高）

#### 快速设置（推荐）

使用npx是最简单的方式，它会自动下载并运行最新版本：

##### Claude Desktop应用

在Claude Desktop配置文件中添加服务器：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "seedream-volcengine": {
      "command": "npx",
      "args": [
        "-y",
        "https://github.com/kylin1020/seedream-v4-volcengine-mcp.git"
      ],
      "env": {
        "VOLCENGINE_API_KEY": "your_volcengine_api_key_here"
      }
    }
  }
}
```

##### Kilo Code MCP设置

添加到MCP设置文件：
`C:\Users\[username]\AppData\Roaming\Code\User\globalStorage\kilocode.kilo-code\settings\mcp_settings.json`

```json
{
  "mcpServers": {
    "seedream-volcengine": {
      "command": "npx",
      "args": [
        "-y",
        "https://github.com/kylin1020/seedream-v4-volcengine-mcp.git"
      ],
      "env": {
        "VOLCENGINE_API_KEY": "your_volcengine_api_key_here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

#### 手动安装（替代方案）

如果您更喜欢本地安装：

1. **克隆仓库**
```bash
git clone https://github.com/kylin1020/seedream-v4-volcengine-mcp.git
cd seedream-v4-volcengine-mcp
```

2. **安装依赖**
```bash
npm install
```

3. **构建项目**
```bash
npm run build
```

4. **在配置中使用绝对路径**
```json
{
  "mcpServers": {
    "seedream-volcengine": {
      "command": "node",
      "args": ["/absolute/path/to/seedream-v4-volcengine-mcp/build/index.js"],
      "env": {
        "VOLCENGINE_API_KEY": "your_volcengine_api_key_here"
      }
    }
  }
}
```

**获取绝对路径的辅助脚本：**
```bash
npm run get-path
```

### 使用示例

配置完成后，您可以通过MCP客户端使用服务器：

#### 基础图像生成
```
生成一张宁静的山景日落图，带有湖面倒影
```

#### 指定纵横比（通过提示词）
```
创建一张竖屏的未来城市景观图（9:16宽高比）
```

#### 指定图像尺寸
```
生成一张高清的山景图（4K尺寸）
```

#### 生成多张图像
```
生成3个可爱机器人角色的变体
```

#### 批量并发生成（使用 batch_generate_images）
```
同时为以下提示词生成图像："一朵红玫瑰"、"蓝色海洋"、"绿色森林"
```

#### 批量生成并控制并发数
```
为5个不同的场景生成图像，但最多只能同时进行2个任务以控制API负载
```

#### 中文提示词支持
```
生成一张中国传统山水画的图片
```

#### 高引导度获得精确结果
```
生成一张人在图书馆看书的写实肖像照（guidance scale: 3.0）
```

#### 使用参考图生成（图生图）
```
基于这张图片生成一个相似风格的场景：/path/to/reference/image.jpg
```

#### 使用URL作为参考图
```
参考这张图片的风格生成新图：https://example.com/image.jpg
```

#### 使用多张参考图
```
结合这些参考图的风格生成图片：["image1.jpg", "image2.jpg"]
```

### API响应格式

服务器返回生成图像的详细信息：

```
✅ 使用SeedDream 4.0成功生成1张图像：

📝 提示词: "宁静的山景日落"
📐 尺寸规格: 2K
🎯 引导度: 2.5
🌱 使用的种子: 1234567890

🖼️  生成的图像：
图像 1 (1024x1024): https://api.volcengine.com/...
```

### 开发

#### 本地测试
```bash
# 直接测试服务器
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node build/index.js
```

#### 监听模式
```bash
npm run watch
```

#### Inspector工具
```bash
npm run inspector
```

### 故障排除

#### 常见问题

1. **"VOLCENGINE_API_KEY environment variable is not set"**
   - 服务器将继续运行并显示此友好的错误消息
   - 确保在MCP配置中正确设置了火山引擎API密钥
   - 验证密钥有效且有足够的配额
   - **注意**: 当API密钥缺失时，服务器不再崩溃

2. **"Server not showing up in Claude"**
   - 如果使用npx配置，确保已安装Node.js
   - 对于手动安装，检查绝对路径是否正确
   - 修改配置后重启Claude Desktop
   - 验证JSON配置语法是否有效

3. **"Generation failed"**
   - 检查您的火山引擎账户是否有足够的配额
   - 验证API密钥是否具有必要的权限
   - 尝试使用更简单的提示词测试连接

4. **"npx command not found"**
   - 确保Node.js已正确安装
   - 尝试运行`node --version`和`npm --version`验证安装

### 服务器稳定性改进

✅ **健壮的错误处理**: 即使没有API密钥，服务器也会继续运行
✅ **优雅关闭**: 正确处理SIGINT和SIGTERM信号
✅ **用户友好的消息**: 清晰的错误消息和设置说明
✅ **不再崩溃**: 消除了导致连接断开的`process.exit()`调用

### 调试日志

服务器将调试信息输出到stderr，有助于诊断问题：

- 生成进度更新
- 带有详细说明的错误消息
- API调用详情
- 优雅关闭通知

### 定价

图像生成费用由火山引擎的定价结构决定。请查看 [火山引擎定价](https://www.volcengine.com/pricing) 了解当前费率。

### 许可证

本项目采用MIT许可证 - 详见LICENSE文件。

### 贡献

1. Fork本仓库
2. 创建功能分支
3. 进行更改
4. 如适用，添加测试
5. 提交拉取请求

### 支持

对于以下相关问题：

- **此MCP服务器**: 在本仓库中提交issue
- **火山引擎API**: 联系火山引擎支持
- **SeedDream 4.0模型**: 参考火山引擎文档

### 更新日志

#### v0.2.0 (最新)

- 🖼️ 新增参考图功能（图生图）
- 支持URL和本地图片路径作为参考图
- 本地图片自动转换为base64
- 支持单个或多个参考图输入

#### v0.1.0

- 🎉 初始版本
- 支持单张和批量图像生成
- 双语提示词支持（中英文）
- 多种纵横比支持
- 可配置的生成参数
- 健壮的错误处理
- 优雅的关闭机制

---

## English Version

### Features

- ✅ **High-quality image generation** - Using SeedDream 4.0 model with cinematic beauty
- 🌐 **Bilingual support** - Supports English and Chinese prompts
- 🎨 **Flexible size options** - Supports 1K, 2K, and 4K size specifications
- ⚡ **Fast generation** - About 3 seconds for 1K images
- 🎯 **Strong instruction following** - Highly accurate text-to-image conversion
- 🖼️ **Reference image support** - Image-to-image generation with URL or local file paths
- 💾 **Flexible output options** - Support for custom save paths and filenames

### Available Tools

#### `generate_image`

Generate images from text prompts using Volcengine's SeedDream 4.0 model.

**Parameters:**

- `prompt` (required): Text description of the image (supports English and Chinese). **Tip: You can specify aspect ratio in the prompt, e.g., "portrait-oriented cityscape", "9:16 aspect ratio landscape", and the model will automatically generate according to your requirements**
- `size` (optional): Image size specification - options: `1K`, `2K`, `4K` (default: `2K`)
- `guidance_scale` (optional): Prompt adherence strength, higher values follow prompt more literally (2.0-3.0, default: 2.5)
- `seed` (optional): Random seed for reproducible results (0-2147483647)
- `num_images` (optional): Number of images to generate (1-4, default: 1)
- `output_directory` (optional): Directory to save generated images (MUST be absolute path). If not specified, images will only be returned as URLs. If set to empty string or null, images will be saved to a default temporary directory
- `reference_images` (optional): Reference image(s) for image-to-image generation. Can be a single image or an array of images. Each image can be either a URL (http/https) or a local file path (MUST be absolute path). Local images will be automatically converted to base64
- `filename` (optional): Custom filename for saved images (default: seedream_{timestamp}_{index}.png). For multiple images, index will be automatically appended

#### `batch_generate_images`

Batch generate multiple images concurrently using SeedDream 4.0. This tool allows you to generate multiple different images in parallel with controlled concurrency. Each task can have different prompts, settings, and parameters. Perfect for efficiently generating multiple variations, scenes, or concepts.

**Parameters:**

- `tasks` (required): Array of image generation tasks to execute concurrently. Each task has the same parameters as the `generate_image` tool:
  - `prompt` (required): Text description of the image
  - `size` (optional): Image size specification - `1K`, `2K`, `4K` (default: `2K`)
  - `guidance_scale` (optional): Prompt adherence strength (2.0-3.0, default: 2.5)
  - `seed` (optional): Random seed (0-2147483647)
  - `num_images` (optional): Number of images per task (1-4, default: 1)
  - `output_directory` (optional): Directory to save images (absolute path)
  - `reference_images` (optional): Array of reference images (for image-to-image generation)
  - `filename` (optional): Custom filename

- `max_concurrent` (optional): Maximum number of tasks to run concurrently (1-10, default: 3). Lower values reduce API load, higher values increase speed

### Installation

#### Prerequisites

1. **Volcengine API Key**: Get your API key from Volcengine Console
   - Sign up for an account at [Volcengine Console](https://console.volcengine.com/)
   - Navigate to API key management and generate an API key
   - Keep your key secure for configuration

2. **Node.js**: Ensure Node.js is installed (version 16 or higher)

#### Quick Setup (Recommended)

Using npx is the easiest way, it automatically downloads and runs the latest version:

##### For Claude Desktop App

Add the server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "seedream-volcengine": {
      "command": "npx",
      "args": [
        "-y",
        "https://github.com/kylin1020/seedream-v4-volcengine-mcp.git"
      ],
      "env": {
        "VOLCENGINE_API_KEY": "your_volcengine_api_key_here"
      }
    }
  }
}
```

##### For Kilo Code MCP Settings

Add to your MCP settings file at:
`C:\Users\[username]\AppData\Roaming\Code\User\globalStorage\kilocode.kilo-code\settings\mcp_settings.json`

```json
{
  "mcpServers": {
    "seedream-volcengine": {
      "command": "npx",
      "args": [
        "-y",
        "https://github.com/kylin1020/seedream-v4-volcengine-mcp.git"
      ],
      "env": {
        "VOLCENGINE_API_KEY": "your_volcengine_api_key_here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

#### Manual Installation (Alternative)

If you prefer to install locally:

1. **Clone the repository**
```bash
git clone https://github.com/kylin1020/seedream-v4-volcengine-mcp.git
cd seedream-v4-volcengine-mcp
```

2. **Install dependencies**
```bash
npm install
```

3. **Build the project**
```bash
npm run build
```

4. **Use absolute path in configuration**
```json
{
  "mcpServers": {
    "seedream-volcengine": {
      "command": "node",
      "args": ["/absolute/path/to/seedream-v4-volcengine-mcp/build/index.js"],
      "env": {
        "VOLCENGINE_API_KEY": "your_volcengine_api_key_here"
      }
    }
  }
}
```

**Helper script to get absolute path:**
```bash
npm run get-path
```

### Usage Examples

Once configured, you can use the server through your MCP client:

#### Basic Image Generation
```
Generate an image of a serene mountain landscape at sunset with a lake reflection
```

#### Specify Aspect Ratio (via Prompt)
```
Create a portrait-oriented image of a futuristic cityscape (9:16 aspect ratio)
```

#### Specific Image Size
```
Generate a high-resolution landscape image (4K size)
```

#### Generate Multiple Images
```
Generate 3 variations of a cute robot character
```

#### Batch Concurrent Generation (using batch_generate_images)
```
Generate images concurrently for these prompts: "a red rose", "a blue ocean", "a green forest"
```

#### Batch Generation with Concurrency Control
```
Generate images for 5 different scenes, but limit concurrent tasks to 2 to control API load
```

#### Chinese Language Support
```
生成一张中国传统山水画的图片
```

#### High Guidance for Precise Results
```
Generate a photorealistic portrait of a person reading a book in a library (guidance scale: 3.0)
```

#### Using Reference Images (Image-to-Image)
```
Generate a similar style scene based on this image: /path/to/reference/image.jpg
```

#### Using URL as Reference Image
```
Generate a new image referencing the style of: https://example.com/image.jpg
```

#### Using Multiple Reference Images
```
Combine the styles from these reference images: ["image1.jpg", "image2.jpg"]
```

### API Response Format

The server returns detailed information about generated images:

```
✅ Successfully generated 1 image(s) using SeedDream 4.0:

📝 Prompt: "a serene mountain landscape at sunset"
📐 Size: 2K
🎯 Guidance Scale: 2.5
🌱 Seed Used: 1234567890

🖼️  Generated Images:
Image 1 (1024x1024): https://api.volcengine.com/...
```

### Development

#### Local Testing
```bash
# Test the server directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node build/index.js
```

#### Watch Mode
```bash
npm run watch
```

#### Inspector Tool
```bash
npm run inspector
```

### Troubleshooting

#### Common Issues

1. **"VOLCENGINE_API_KEY environment variable is not set"**
   - The server will continue running and show this helpful error message
   - Ensure your Volcengine API key is properly set in the MCP configuration
   - Verify the key is valid and has sufficient quota
   - **Note**: The server no longer crashes when the API key is missing

2. **"Server not showing up in Claude"**
   - If using npx configuration, ensure you have Node.js installed
   - For manual installation, check that the absolute path is correct
   - Restart Claude Desktop after configuration changes
   - Verify the JSON configuration syntax is valid

3. **"Generation failed"**
   - Check your Volcengine account has sufficient quota
   - Verify your API key has the necessary permissions
   - Try with a simpler prompt to test connectivity

4. **"npx command not found"**
   - Ensure Node.js is properly installed
   - Try running `node --version` and `npm --version` to verify installation

### Server Stability Improvements

✅ **Robust error handling**: Server continues running even without API key
✅ **Graceful shutdown**: Proper handling of SIGINT and SIGTERM signals
✅ **User-friendly messages**: Clear error messages with setup instructions
✅ **No more crashes**: Eliminated `process.exit()` calls that caused connection drops

### Debug Logging

The server outputs debug information to stderr, which can help diagnose issues:

- Generation progress updates
- Error messages with helpful instructions
- API call details
- Graceful shutdown notifications

### Pricing

Image generation costs are determined by Volcengine's pricing structure. Check [Volcengine Pricing](https://www.volcengine.com/pricing) for current rates.

### License

This project is licensed under the MIT License - see the LICENSE file for details.

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Support

For issues related to:

- **This MCP server**: Open an issue in this repository
- **Volcengine API**: Contact Volcengine support
- **SeedDream 4.0 model**: Refer to Volcengine documentation

### Changelog

#### v0.2.0 (Latest)

- 🖼️ Added reference image support (image-to-image generation)
- Support for both URL and local file paths as reference images
- Automatic base64 conversion for local images
- Support for single or multiple reference images

#### v0.1.0

- 🎉 Initial release
- Support for single and batch image generation
- Bilingual prompt support (English/Chinese)
- Multiple aspect ratios
- Configurable generation parameters
- Robust error handling
- Graceful shutdown mechanism

