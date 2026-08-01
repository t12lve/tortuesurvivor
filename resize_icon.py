import sys
from PIL import Image

try:
    img = Image.open('source/tortuesurvivor.ico')
    img = img.resize((256, 256), Image.Resampling.LANCZOS)
    img.save('source/tortuesurvivor_256.ico', format='ICO', sizes=[(256, 256)])
    print("Icon resized successfully.")
except Exception as e:
    print("Error:", e)
