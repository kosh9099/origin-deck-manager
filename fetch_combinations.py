import urllib.request
import json
import csv
import time
from urllib.error import URLError, HTTPError

# 입력 파일 및 출력 파일 경로
input_file = r"c:\Users\jlg20\OneDrive\바탕 화면\대항오\origin-deck-manager\항구명.txt"
output_file = r"c:\Users\jlg20\OneDrive\바탕 화면\대항오\origin-deck-manager\항구조합식.csv"

# API 엔드포인트
url = 'https://zoxjvl.pythonanywhere.com/api/search'

def search_port(port_name):
    data = json.dumps({'query': port_name}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode('utf-8'))
        return result
    except HTTPError as e:
        return {'error': f'HTTP Error {e.code}'}
    except URLError as e:
        return {'error': f'URL Error {e.reason}'}
    except Exception as e:
        return {'error': str(e)}

def main():
    # 항구명 리스트 읽기
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            ports = [line.strip() for line in f.readlines() if line.strip()]
    except Exception as e:
        print(f"파일 읽기 오류: {e}")
        return

    print(f"총 {len(ports)}개의 항구명을 검색합니다.")
    
    if ports and ports[0] == '항구명':
        ports = ports[1:] # 헤더 제외
        print("첫 번째 줄 '항구명'을 제외했습니다.")

    results = []
    
    # 각 항구명에 대해 검색 수행
    for i, port in enumerate(ports):
        print(f"[{i+1}/{len(ports)}] '{port}' 검색 중...", end=' ', flush=True)
        
        result = search_port(port)
        
        if 'error' in result:
            print(f"실패 ({result['error']})")
            results.append({
                '항구명': port,
                '쉬움': '오류',
                '보통': '오류',
                '어려움': '오류',
                '비고': result['error']
            })
        else:
            print("성공")
            results.append({
                '항구명': port,
                '쉬움': result.get('쉬움', ''),
                '보통': result.get('보통', ''),
                '어려움': result.get('어려움', ''),
                '비고': ''
            })
            
        # 서버 부하를 막기 위해 약간의 지연 시간 추가 (0.2초)
        time.sleep(0.2)

    # 결과를 CSV 파일로 저장
    try:
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            fieldnames = ['항구명', '쉬움', '보통', '어려움', '비고']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            
            writer.writeheader()
            for row in results:
                writer.writerow(row)
                
        print(f"\n작업 완료! 결과가 {output_file} 에 저장되었습니다.")
        print("이 CSV 파일을 구글 시트에서 '파일' -> '가져오기' -> '업로드' 하시면 됩니다.")
    except Exception as e:
        print(f"파일 저장 오류: {e}")

if __name__ == '__main__':
    main()
