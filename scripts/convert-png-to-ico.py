from PIL import Image
import os

# Load the transparent PNG
img = Image.open('logo/marknestlogo-transparent.png')
print(f"Loaded transparent PNG: {img.mode} {img.size}")

# Convert to ICO format (keeping transparency)
ico_path = 'logo/marknestlogo.ico'
img.save(ico_path, 'ICO', sizes=[(img.width, img.height)])
print(f"Saved transparent ICO: {ico_path}")
print("Icon files prepared. Ready for build.")
