# Sprite Animation Methodology

## Overview
This project uses AI-generated video converted to sprite frames for character animations.

## Process

### 1. AI Video Generation
- **Service**: https://fal.ai/models/fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video
- **Cost**: $0.19 per 5-second clip
- **Prompt Strategy**: Character with solid green background for easy chroma keying
- **Output**: 5-second video clips at 60fps

### 2. Frame Extraction with FFmpeg
Extract frames from video using chroma keying to remove green background:

```bash
# Idle animation extraction
ffmpeg -i idle.mp4 -vf "colorkey=0x00D84D:0.4:0.1" -pix_fmt rgba frameIdle_%04d.png

# Run animation extraction
ffmpeg -i run.mp4 -vf "colorkey=0x00D84D:0.4:0.1" -pix_fmt rgba frame_%04d.png
```

### 3. Frame Selection
After extraction, manually selected the best frames:
- **Idle**: Frames 64-141 (78 frames) - smooth breathing/idle motion
- **Run**: Frames 36-141 (106 frames) - complete running cycle

## Current Sprite Files

### Active Frames (DO NOT DELETE)
- `frameIdle_0064.png` to `frameIdle_0141.png` - 78 idle animation frames
- `frame_0036.png` to `frame_0141.png` - 106 running animation frames
- `character.png` - Fallback static sprite

### Legacy Files (Can be deleted)
- `character-idle.png` - Old static idle sprite
- `character-run1.png` through `character-run4.png` - Old test sprites

## Animation Implementation
Animations are created in `GameScene.js` at 60fps to match source video framerate, providing smooth motion.
