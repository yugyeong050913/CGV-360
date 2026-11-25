# CINEdeCHEF

`reference.jpeg`의 좌석과 실내 마감, `layout.svg`의 A–C열 배치를 참고해 Three.js로 모델링했습니다. 좌석은 각 열 6개씩 18개이며, 기본 시점은 C03입니다. 하단 좌석 번호를 선택하면 관람 시점이 바뀌며, 화면을 드래그하거나 방향키를 눌러 둘러볼 수 있습니다.

GitHub Pages에는 `CGV-360`을 사이트 루트로 배포하고 `CINEdeCHEF/`를 엽니다. 같은 레벨의 `2D/`에서 Three.js, 스타일과 폰트를 공유합니다. 장면은 CINEdeCHEF의 코드로 생성됩니다. 로컬에서는 `CGV-360`에서 `python3 -m http.server 8000`을 실행한 뒤 `http://localhost:8000/CINEdeCHEF/`를 엽니다.

`RoundedBoxGeometry.js`는 Three.js r180 애드온이며 MIT 라이선스는 `../2D/vendor/LICENSE`에 있습니다.
