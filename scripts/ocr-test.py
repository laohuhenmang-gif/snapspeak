#!/usr/bin/env python3
"""
语拍提醒 - OCR 测试脚本

用法:
  python ocr-test.py <图片路径>
  python ocr-test.py <图片路径> --api-key sk-xxx

依赖:
  pip install requests base64

支持两种 OCR 方式:
  1. DeepSeek Vision API（推荐，需 API Key）
  2. Tesseract（本地，需安装 Tesseract OCR）

环境变量:
  DEEPSEEK_API_KEY - DeepSeek API Key
"""

import sys
import os
import json
import base64
import argparse

DEEPSEEK_API = "https://api.deepseek.com/chat/completions"


def ocr_deepseek(image_path: str, api_key: str, model: str = "deepseek-v4-pro") -> str:
    """使用 DeepSeek Vision API 进行 OCR"""
    import requests

    with open(image_path, "rb") as f:
        img_data = base64.b64encode(f.read()).decode("utf-8")

    ext = os.path.splitext(image_path)[1].lower()
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "bmp": "image/bmp", "webp": "image/webp"}
    img_mime = mime.get(ext.replace(".", ""), "image/png")

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "你是 OCR 识别助手。识别图片中的文字，输出原始文字内容。如果是待办事项清单，请分行列出。不要额外解释。"
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "请识别这张图片中的文字："},
                    {"type": "image_url", "image_url": {"url": f"data:{img_mime};base64,{img_data}"}}
                ]
            }
        ],
        "temperature": 0.1,
        "max_tokens": 2048
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    resp = requests.post(DEEPSEEK_API, json=payload, headers=headers, timeout=60)
    if resp.status_code != 200:
        raise Exception(f"API error {resp.status_code}: {resp.text}")

    result = resp.json()
    return result["choices"][0]["message"]["content"]


def ocr_tesseract(image_path: str) -> str:
    """使用本地 Tesseract OCR 识别"""
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        print("请先安装依赖: pip install pytesseract pillow")
        print("并安装 Tesseract OCR: https://github.com/UB-Mannheim/tesseract")
        sys.exit(1)

    try:
        img = Image.open(image_path)
    except Exception as e:
        print(f"无法打开图片: {e}")
        sys.exit(1)

    try:
        text = pytesseract.image_to_string(img, lang='chi_sim+eng')
        return text.strip()
    except Exception as e:
        print(f"Tesseract OCR 失败: {e}")
        print("请确保已安装 Tesseract 并配置中文语言包")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="语拍提醒 OCR 测试工具")
    parser.add_argument("image", help="图片文件路径")
    parser.add_argument("--api-key", help="DeepSeek API Key", default=None)
    parser.add_argument("--model", default="deepseek-v4-pro",
                        help="DeepSeek 模型 (默认: deepseek-v4-pro)")
    parser.add_argument("--method", choices=["deepseek", "tesseract"], default="deepseek",
                        help="OCR 方式 (默认: deepseek)")
    parser.add_argument("--output", "-o", help="输出结果到文件", default=None)

    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"错误: 文件不存在 - {args.image}")
        sys.exit(1)

    if args.method == "deepseek":
        api_key = args.api_key or os.environ.get("DEEPSEEK_API_KEY")
        if not api_key:
            print("请提供 DeepSeek API Key（--api-key 或 DEEPSEEK_API_KEY 环境变量）")
            sys.exit(1)
        print(f"正在使用 DeepSeek {args.model} 识别: {args.image}...")
        result = ocr_deepseek(args.image, api_key, args.model)
    else:
        print(f"正在使用 Tesseract 识别: {args.image}...")
        result = ocr_tesseract(args.image)

    print("\n" + "=" * 50)
    print("OCR 识别结果:")
    print("=" * 50)
    print(result)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(result)
        print(f"\n结果已保存到: {args.output}")


if __name__ == "__main__":
    main()
