I have found out that I can use

https://fal.ai/models/fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video

Open source Image to video model, costing me 19 cents per generation of a 5 second clip. I prompted it with my character, and told it to create a solid green background. I then used ffmpeg to color key the background away, and extract individual frames, which I am animating using phaser. The result is a beautiful animation spritesheet I couldnt ever create on my own.

Example ffmpeg command I used to extract the idle frames, from which I made a selection of the best ones: ffmpeg -i idle.mp4 -vf "colorkey=0x00D84D:0.4:0.1" -pix_fmt rgba frameIdle_%04d.png
