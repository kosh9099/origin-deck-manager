import urllib.request
import re

url = 'https://zoxjvl.pythonanywhere.com/'
html = urllib.request.urlopen(url).read().decode('utf-8')

# Extract script tags
scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
for i, script in enumerate(scripts):
    print(f"--- Script {i} ---")
    print(script)
