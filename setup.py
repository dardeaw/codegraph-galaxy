from setuptools import setup, find_packages

setup(
    name="codegraph-galaxy",
    version="1.0.2",
    description="Interactive 3D Galaxy visualization and code intelligence explorer for CodeGraph databases",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="CodeGraph Galaxy Team",
    packages=find_packages(),
    include_package_data=True,
    python_requires=">=3.8",
    install_requires=[
        # Core Python requirements (Standard Library only for zero-dependency)
    ],
    entry_points={
        "console_scripts": [
            "codegraph-galaxy=codegraph_galaxy.cli:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Visualization",
    ],
)
