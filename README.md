# SeedDream 4.0 Volcengine MCP Server

一个基于火山引擎（Volcengine）API的文生图MCP服务器，支持使用SeedDream 4.0模型生成高质量图像。

[English](#english-version) | [中文](#中文版本)

## 中文版本

### 特性

- ✅ **高质量图像生成** - 使用SeedDream 4.0模型，具有电影般的美感
- 🌐 **双语支持** - 支持中英文提示词
- 📐 **多种纵横比** - 支持1:1, 3:4, 4:3, 16:9, 9:16, 2:3, 3:2, 21:9及自定义尺寸
- 🎨 **灵活的尺寸选项** - small（最短边512px）、regular（1百万像素）、big（最长边2048px）
- ⚡ **快速生成** - 约3秒即可生成1K图像
- 🎯 **强大的指令遵循能力** - 高度还原文本描述

### 可用工具

#### `generate_image`

使用火山引擎的SeedDream 4.0模型从文本提示生成图像。

**参数：**

- `prompt` (必需): 图像的文本描述（支持中英文）
- `aspect_ratio` (可选): 图像纵横比 - 可选值: `1:1`, `3:4`, `4:3`, `16:9`, `9:16`, `2:3`, `3:2`, `21:9`, `custom` (默认: `16:9`)
- `size` (可选): 图像尺寸 - 可选值: `small`, `regular`, `big` (默认: `regular`)
  - `small`: 最短边512px
  - `regular`: 总像素1百万（1024x1024）
  - `big`: 最长边2048px
  - 当aspect_ratio为`custom`时忽略此参数
- `width` (可选): 图像宽度（512-2048像素，仅当aspect_ratio为`custom`时使用）
- `height` (可选): 图像高度（512-2048像素，仅当aspect_ratio为`custom`时使用）
- `guidance_scale` (可选): 提示词遵循强度，数值越高越严格遵循提示词 (1.0-10.0, 默认: 2.5)
- `seed` (可选): 随机种子，用于生成可复现的结果 (0-2147483647)
- `num_images` (可选): 生成图像数量 (1-4, 默认: 1)

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
        "https://github.com/your-username/seedream-v4-volcengine-mcp.git"
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
        "https://github.com/your-username/seedream-v4-volcengine-mcp.git"
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
git clone https://github.com/your-username/seedream-v4-volcengine-mcp.git
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

#### 指定纵横比
```
创建一张竖屏的未来城市景观图（纵横比9:16）
```

#### 生成多张图像
```
生成3个可爱机器人角色的变体
```

#### 批量生成
```
为以下提示词生成图像："一朵红玫瑰"、"蓝色海洋"、"绿色森林"
```

#### 中文提示词支持
```
生成一张中国传统山水画的图片
```

#### 高引导度获得精确结果
```
生成一张人在图书馆看书的写实肖像照（guidance scale: 7.5）
```

### API响应格式

服务器返回生成图像的详细信息：

```
✅ 使用SeedDream 4.0成功生成1张图像：

📝 提示词: "宁静的山景日落"
📐 纵横比: 1:1
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

#### v0.1.0 (最新)

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
- 📐 **Multiple aspect ratios** - Supports 1:1, 3:4, 4:3, 16:9, 9:16, 2:3, 3:2, 21:9, and custom sizes
- 🎨 **Flexible size options** - small (shortest dim 512px), regular (1 megapixel), big (longest dim 2048px)
- ⚡ **Fast generation** - About 3 seconds for 1K images
- 🎯 **Strong instruction following** - Highly accurate text-to-image conversion

### Available Tools

#### `generate_image`

Generate images from text prompts using Volcengine's SeedDream 4.0 model.

**Parameters:**

- `prompt` (required): Text description of the image (supports English and Chinese)
- `aspect_ratio` (optional): Image aspect ratio - options: `1:1`, `3:4`, `4:3`, `16:9`, `9:16`, `2:3`, `3:2`, `21:9`, `custom` (default: `16:9`)
- `size` (optional): Image size - options: `small`, `regular`, `big` (default: `regular`)
  - `small`: Shortest dimension 512px
  - `regular`: Always 1 megapixel (1024x1024)
  - `big`: Longest dimension 2048px
  - Ignored if aspect_ratio is `custom`
- `width` (optional): Image width in pixels (512-2048, only used when aspect_ratio is `custom`)
- `height` (optional): Image height in pixels (512-2048, only used when aspect_ratio is `custom`)
- `guidance_scale` (optional): Prompt adherence strength, higher values follow prompt more literally (1.0-10.0, default: 2.5)
- `seed` (optional): Random seed for reproducible results (0-2147483647)
- `num_images` (optional): Number of images to generate (1-4, default: 1)

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
        "https://github.com/your-username/seedream-v4-volcengine-mcp.git"
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
        "https://github.com/your-username/seedream-v4-volcengine-mcp.git"
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
git clone https://github.com/your-username/seedream-v4-volcengine-mcp.git
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

#### Specific Aspect Ratio
```
Create a portrait-oriented image of a futuristic cityscape (aspect ratio 9:16)
```

#### Generate Multiple Images
```
Generate 3 variations of a cute robot character
```

#### Batch Generation
```
Generate images for these prompts: "a red rose", "a blue ocean", "a green forest"
```

#### Chinese Language Support
```
生成一张中国传统山水画的图片
```

#### High Guidance for Precise Results
```
Generate a photorealistic portrait of a person reading a book in a library (guidance scale: 7.5)
```

### API Response Format

The server returns detailed information about generated images:

```
✅ Successfully generated 1 image(s) using SeedDream 4.0:

📝 Prompt: "a serene mountain landscape at sunset"
📐 Aspect Ratio: 1:1
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

#### v0.1.0 (Latest)

- 🎉 Initial release
- Support for single and batch image generation
- Bilingual prompt support (English/Chinese)
- Multiple aspect ratios
- Configurable generation parameters
- Robust error handling
- Graceful shutdown mechanism

