from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs('public/icons', exist_ok=True)


def create_icon(path, size):
    img = Image.new('RGBA', (size, size), (11, 16, 32, 255))
    draw = ImageDraw.Draw(img)

    for y in range(size):
        alpha = int(255 * (1 - (abs(y - size / 2) / (size / 2))))
        for x in range(size):
            color = (20, 184, 166, alpha) if x < size * 0.5 else (34, 197, 94, alpha)
            draw.point((x, y), fill=color)

    pad = int(size * 0.18)
    badge = Image.new('RGBA', (size - 2 * pad, size - 2 * pad), (255, 255, 255, 0))
    bdraw = ImageDraw.Draw(badge)
    bdraw.rounded_rectangle(
        (0, 0, badge.width, badge.height),
        radius=int(size * 0.18),
        fill=(12, 18, 34, 210),
    )
    img.paste(badge, (pad, pad), badge)

    try:
        font = ImageFont.truetype('DejaVuSans-Bold.ttf', int(size * 0.38))
    except Exception:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), 'A', font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) / 2
    y = (size - th) / 2 - size * 0.03
    draw.text((x, y), 'A', font=font, fill=(255, 255, 255, 255))
    img.save(path)


create_icon('public/icons/icon-192.png', 192)
create_icon('public/icons/icon-512.png', 512)
print('created icons')
