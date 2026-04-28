from PIL import Image
import os

src = r"C:\Users\CAMISAMA\.gemini\antigravity\brain\b323bab1-f0c2-4d72-9d8b-107c21e5f8c4\media__1777379607165.png"
out = r"C:\Users\CAMISAMA\.gemini\antigravity\專案\績效追蹤表\public"

img = Image.open(src)
w, h = img.size
print(f"Image size: {w}x{h}")

# Define crop boxes (left, top, right, bottom) based on visual grid
# Row 1: 4 icons — cash, bag, shield, pie
# Row 2: 3 icons — bar_chart, coins, growth_chart
# Row 3: 4 icons — bank, calculator, percent, star

col_w = w // 4   # ~175
r1_top, r1_bot = int(h * 0.02), int(h * 0.19)
r2_top, r2_bot = int(h * 0.20), int(h * 0.38)
r3_top, r3_bot = int(h * 0.39), int(h * 0.57)

icons = {
    "ic_cash":        (0,         r1_top, col_w,     r1_bot),
    "ic_bag":         (col_w,     r1_top, col_w*2,   r1_bot),
    "ic_shield":      (col_w*2,   r1_top, col_w*3,   r1_bot),
    "ic_pie":         (col_w*3,   r1_top, w,         r1_bot),

    "ic_bars":        (0,         r2_top, int(w*0.33), r2_bot),
    "ic_coins":       (int(w*0.33), r2_top, int(w*0.67), r2_bot),
    "ic_growth":      (int(w*0.67), r2_top, w,          r2_bot),

    "ic_bank":        (0,         r3_top, col_w,     r3_bot),
    "ic_calc":        (col_w,     r3_top, col_w*2,   r3_bot),
    "ic_percent":     (col_w*2,   r3_top, col_w*3,   r3_bot),
    "ic_star":        (col_w*3,   r3_top, w,         r3_bot),
}

for name, box in icons.items():
    crop = img.crop(box)
    path = os.path.join(out, f"{name}.png")
    crop.save(path, "PNG")
    print(f"Saved {name}.png  box={box}")

print("Done!")
