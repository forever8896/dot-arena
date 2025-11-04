# Visual Contrast & Clarity Improvements

## Current Issues Identified

### 1. Color Conflicts
- **Rapid Fire & Sniper** both use cyan (#00FFFF) - Cannot distinguish
- **Player hearts & Enemies** both use red (#FF0000) - Confusing
- **Walls & Background** both use pink tones - Low contrast

### 2. Contrast Issues Against Background
- Pink gradient background (#A0004F → #FF1B8D)
- Target indicators at 0.3-0.6 alpha may be too subtle
- Grid lines at 0.05-0.15 alpha barely visible
- Bullet trails may blend with background effects

### 3. Visual Hierarchy
- Too many similar colors in the pink/magenta spectrum
- Player doesn't stand out enough as main focal point
- Enemy distinction needs improvement

## Proposed Color Scheme (High Contrast)

### Core Characters
```
Player:        #FFFFFF (White) with STRONG glow
               + Add cyan outline for contrast
               + Brighter shadow for separation

Enemies:       #FF0000 (Red) - keep but enhance
               + Add darker red outline (#990000)
               + Make shadow more pronounced
```

### Weapon Colors (All Unique)
```
Rapid Fire:    #00FF00 (Bright Green)  - Fast, natural
Sniper:        #00FFFF (Cyan)          - Cool, precise
Shotgun:       #FF6600 (Orange)        - Warm, explosive
Burst:         #FF00FF (Magenta)       - Energetic
```

### Target Indicators
```
Range circles: Increase opacity to 0.5-0.6
Target lines:  Increase opacity to 0.8-0.9
               + Add dark outline/glow for contrast
```

### Background Elements
```
Walls:         #6B0036 (Darker pink) with WHITE outline
               Opacity 0.3 on outline for strong contrast

Grid lines:    Increase major grid to 0.25 alpha
               Increase minor grid to 0.10 alpha
```

### UI Elements
```
HP Hearts:     #FF1493 (Deep Pink) - distinct from enemies
DOT Counter:   #FFD700 (Gold) - valuable feeling
Kills:         #FFFFFF (White)
```

## Implementation Priority

### High Priority (Core Gameplay)
1. ✅ Change Rapid Fire bullet color from cyan to green
2. ✅ Increase target indicator opacity
3. ✅ Add outlines to walls for contrast
4. ✅ Change HP heart color to distinguish from enemies
5. ✅ Enhance player visual with outline/glow

### Medium Priority (Polish)
6. ✅ Adjust bullet trail effects for better visibility
7. ✅ Enhance weapon pickup glow effects
8. ✅ Improve shadow contrast
9. ✅ Adjust grid line visibility

### Low Priority (Fine-tuning)
10. Test and adjust all values in-game
11. Add accessibility options for colorblind modes

## Technical Changes Required

### Files to Modify:
1. `src/scenes/GameScene.js` - Bullet textures and background
2. `src/entities/Weapon.js` - Weapon colors
3. `src/systems/TargetIndicators.js` - Indicator opacity/outlines
4. `src/entities/Player.js` - Player visual enhancements
5. `src/entities/Enemy.js` - Enemy outline improvements
6. `src/effects/VisualEffects.js` - Trail and impact colors
