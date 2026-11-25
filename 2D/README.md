# 2D 영화관 좌석 시야 체험

## 로컬 실행

이 폴더에서 `python3 -m http.server 8000`을 실행한 뒤 브라우저에서 `http://localhost:8000`을 엽니다. Three.js와 GLB가 포함되어 있으며 별도의 빌드나 CDN 연결이 필요 없습니다.

## GitHub Pages

이 폴더의 파일을 GitHub 저장소 루트에 올립니다. 저장소의 **Settings → Pages**에서 **Deploy from a branch**를 선택하고, 파일을 올린 브랜치와 **/ (root)**를 지정합니다. `.nojekyll` 파일도 함께 올립니다. 모델과 모듈 경로가 상대 경로이므로 프로젝트 사이트의 저장소 하위 경로에서도 실행됩니다.

## 좌석과 상영관 추가

`cinemas.js`의 `seats`에 좌석 ID와 관람객 눈높이의 GLB 월드 좌표 `eye: [x, y, z]`를 추가합니다. 상영관을 추가할 경우 해당 항목에 모델 경로, 스크린 중심 `screenTarget`, 기본 좌석 `defaultSeat`, 좌석 목록을 작성합니다. 상영관이 두 개 이상이면 선택 메뉴가 나타납니다.

원본 GLB에 좌석 이름과 카메라가 없어 스크린과 의자 메시의 좌표를 사용했습니다. 현재 모델의 여섯 번째 줄에서 스크린 중심선에 가장 가까운 좌석을 F08로 지정했습니다. 관람객 눈높이는 등받이와 좌면 형상에 맞춰 모델 단위로 설정했습니다.

## 출처

[Low Poly Cinema](https://sketchfab.com/3d-models/low-poly-cinema-b7e7bdff0f0446b49c8c43643b160dd3), b000f, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 웹페이지는 WebP 텍스처를 포함한 `2D cinema.optimized.glb`를 사용합니다. 배포 폴더 밖에 보관된 `2D cinema.original.glb`는 원본 백업입니다. Three.js r180의 라이선스는 `vendor/LICENSE`에 있습니다.
