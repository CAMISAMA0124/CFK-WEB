from PIL import Image
import os

src_dir = r"C:\Users\CAMISAMA\.gemini\antigravity\專案\績效追蹤表\public"
icons = ["ic_cash","ic_bag","ic_shield","ic_pie","ic_bars","ic_coins",
         "ic_growth","ic_bank","ic_calc","ic_percent","ic_star"]

for name in icons:
    path = os.path.join(src_dir, f"{name}.png")
    img = Image.open(path).convert("RGBA")
    data = img.getdata()
    new_data = []
    for r, g, b, a in data:
        # Make near-white pixels transparent
        if r > 220 and g > 220 and b > 220:
            new_data.append((r, g, b, 0))
        elif r > 200 and g > 200 and b > 200 and abs(r-g)<20 and abs(g-b)<20:
            # near-grey also transparent
            alpha = int(((r - 200) / 55) * 255)
            new_data.append((r, g, b, max(0, 255 - alpha)))
        else:
            new_data.append((r, g, b, a))
    img.putdata(new_data)
    img.save(path, "PNG")
    print(f"Processed {name}.png")

print("Done!")
