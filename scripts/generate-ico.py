from PIL import Image
import os

# Load the transparent PNG
img = Image.open('logo/marknestlogo-transparent.png')
print(f"Loading: {img.mode} {img.size}")

# Create multiple sizes for ICO (ICO files typically contain multiple resolutions)
sizes = [256, 128, 64, 48, 32, 16]
ico_list = []

for size in sizes:
    # Resize image maintaining aspect ratio with good quality
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    ico_list.append(resized)

# Save as ICO with transparency preserved
ico_path = 'src-tauri/icons/icon.ico'
ico_list[0].save(
    ico_path,
    format='ICO',
    sizes=[(s, s) for s in sizes]
)

print(f"Saved proper ICO: {ico_path}")
print(f"File size: {os.path.getsize(ico_path)} bytes")
