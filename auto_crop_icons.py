from PIL import Image, ImageOps
import os

src = r"C:\Users\CAMISAMA\.gemini\antigravity\brain\b323bab1-f0c2-4d72-9d8b-107c21e5f8c4\media__1777379607165.png"
out_dir = r"C:\Users\CAMISAMA\.gemini\antigravity\專案\績效追蹤表\public"

img = Image.open(src).convert("RGBA")
w, h = img.size

# Use alpha if available, else use distance from white
if img.mode == 'RGBA':
    r, g, b, a = img.split()
    mask = a.point(lambda x: 255 if x > 5 else 0)
else:
    gray = img.convert("L")
    mask = gray.point(lambda x: 255 if x < 250 else 0)

# Clean edges
pixels = mask.load()
for x in range(w):
    pixels[x,0]=0; pixels[x,h-1]=0
for y in range(h):
    pixels[0,y]=0; pixels[w-1,y]=0

def find_blobs(mask):
    blobs = []
    visited = set()
    pixels = mask.load()
    w, h = mask.size
    
    for y in range(h):
        for x in range(w):
            if pixels[x, y] > 0 and (x, y) not in visited:
                # Start a new blob
                stack = [(x, y)]
                visited.add((x, y))
                bx1, by1, bx2, by2 = x, y, x, y
                while stack:
                    cx, cy = stack.pop()
                    bx1 = min(bx1, cx); by1 = min(by1, cy)
                    bx2 = max(bx2, cx); by2 = max(by2, cy)
                    # Check 8 neighbors
                    for dx in [-1, 0, 1]:
                        for dy in [-1, 0, 1]:
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h and \
                               pixels[nx, ny] > 0 and (nx, ny) not in visited:
                                visited.add((nx, ny))
                                stack.append((nx, ny))
                # Only keep blobs of a reasonable size
                if (bx2-bx1) > 10 and (by2-by1) > 10:
                    blobs.append([bx1, by1, bx2, by2])
    return blobs

blobs = find_blobs(mask)

# Merge blobs that are very close (overlapping or within 20px)
def merge_blobs(blobs):
    changed = True
    while changed:
        changed = False
        for i in range(len(blobs)):
            for j in range(i + 1, len(blobs)):
                b1 = blobs[i]
                b2 = blobs[j]
                # If they are close horizontally and vertically
                # Check distance between bboxes
                dx = max(0, b1[0] - b2[2], b2[0] - b1[2])
                dy = max(0, b1[1] - b2[3], b2[1] - b1[3])
                if dx < 30 and dy < 30:
                    # Merge
                    blobs[i] = [min(b1[0], b2[0]), min(b1[1], b2[1]), max(b1[2], b2[2]), max(b1[3], b2[3])]
                    blobs.pop(j)
                    changed = True
                    break
            if changed: break
    return blobs

blobs = merge_blobs(blobs)
print(f"Found {len(blobs)} merged blobs.")

# Sort by Row then Col
# Group by Y coordinate (within 100px)
blobs.sort(key=lambda b: (b[1] // 150, b[0]))

icon_names = [
    "ic_cash", "ic_bag", "ic_shield", "ic_pie",
    "ic_bars", "ic_coins", "ic_growth",
    "ic_bank", "ic_calc", "ic_percent", "ic_star"
]

for i, name in enumerate(icon_names):
    if i >= len(blobs): break
    bbox = blobs[i]
    
    # Crop with 5px padding
    pad = 5
    crop_box = (max(0, bbox[0]-pad), max(0, bbox[1]-pad), min(w, bbox[2]+pad), min(h, bbox[3]+pad))
    crop = img.crop(crop_box)
    
    # BG removal
    crop = crop.convert("RGBA")
    data = crop.getdata()
    new_data = []
    for r, g, b, a in data:
        dist = ((255-r)**2 + (255-g)**2 + (255-b)**2)**0.5
        if dist < 40:
            new_data.append((r, g, b, 0))
        elif dist < 80:
            alpha = int((dist - 40) / 40 * 255)
            new_data.append((r, g, b, max(0, alpha)))
        else:
            new_data.append((r, g, b, a))
    crop.putdata(new_data)
    
    path = os.path.join(out_dir, f"{name}.png")
    crop.save(path, "PNG")
    print(f"Saved {name}.png with bbox {crop_box}")
