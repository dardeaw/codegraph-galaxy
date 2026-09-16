import os
import sys
import subprocess

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_py = os.path.join(root, "app.py")
    subprocess.run([sys.executable, app_py] + sys.argv[1:])

if __name__ == "__main__":
    main()
