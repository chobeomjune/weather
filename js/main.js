console.log("================================");
console.log("날씨 앱 실행");
console.log("================================");

// Stormglass API 키 입력
const API_KEY = prompt(
  "Stormglass API 키를 입력하세요."
);

if (!API_KEY || API_KEY.trim() === "") {
  console.warn("API 키 입력이 취소되었습니다.");
} else {
  const apiKey = API_KEY.trim();

  // 날씨 API 요청 항목
  const weatherParams = [
    "airTemperature",
    "humidity",
    "precipitation",
    "pressure",
    "snowDepth",
    "visibility",
    "uvIndex"
  ];

  // 해양 API 요청 항목
  const marineParams = [
    "waveHeight"
  ];

  // 현재 위치 가져오기
  navigator.geolocation.getCurrentPosition(
    async function (position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      console.log("현재 위도:", latitude);
      console.log("현재 경도:", longitude);

      try {
        // 현재 시간 기준으로 요청 범위 설정
        const now = new Date();

        const start = new Date(now);
        start.setMinutes(0, 0, 0);

        const end = new Date(start);
        end.setHours(end.getHours() + 2);

        // API 요청 주소 생성
        function createUrl(endpoint, params) {
          const url = new URL(
            `https://api.stormglass.io/v2/${endpoint}`
          );

          url.searchParams.set("lat", latitude);
          url.searchParams.set("lng", longitude);
          url.searchParams.set("params", params.join(","));
          url.searchParams.set("start", start.toISOString());
          url.searchParams.set("end", end.toISOString());

          return url;
        }

        // API 요청 함수
        async function fetchData(url) {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: apiKey
            }
          });

          if (!response.ok) {
            const message = await response.text();

            throw new Error(
              `HTTP ${response.status}: ${message}`
            );
          }

          return response.json();
        }

        console.log("날씨 데이터 요청 중...");
        console.log("해양 데이터 요청 중...");

        // 날씨 API 요청
        const weatherUrl = createUrl(
          "weather/point",
          weatherParams
        );

        // 해양 API 요청
        const marineUrl = createUrl(
          "marine/point",
          marineParams
        );

        // 두 API 요청을 각각 실행
        const weatherData = await fetchData(weatherUrl);

        const marineResult = await Promise.allSettled([
          fetchData(marineUrl)
        ]);

        let marineData = null;

        if (marineResult[0].status === "fulfilled") {
          marineData = marineResult[0].value;
        } else {
          console.warn(
            "해양 데이터는 제공되지 않았습니다:",
            marineResult[0].reason.message
          );
        }

        // 날씨 데이터 확인
        if (
          !weatherData.hours ||
          weatherData.hours.length === 0
        ) {
          throw new Error(
            "날씨 API에서 시간별 데이터를 받지 못했습니다."
          );
        }

        // 현재 시간과 가장 가까운 데이터 선택
        function findNearestHour(hours) {
          if (!hours || hours.length === 0) {
            return null;
          }

          return hours.reduce((nearest, hour) => {
            const nearestTime = new Date(nearest.time);
            const currentTime = new Date(hour.time);

            const nearestDiff = Math.abs(
              nearestTime.getTime() - now.getTime()
            );

            const currentDiff = Math.abs(
              currentTime.getTime() - now.getTime()
            );

            return currentDiff < nearestDiff
              ? hour
              : nearest;
          });
        }

        const weatherHour = findNearestHour(
          weatherData.hours
        );

        const marineHours =
          marineData && marineData.hours
            ? marineData.hours
            : [];

        const marineHour = findNearestHour(
          marineHours
        );

        // API 응답값 추출
        function getValue(hour, parameter) {
          if (!hour || hour[parameter] == null) {
            return null;
          }

          const item = hour[parameter];

          // 값이 숫자로 바로 반환된 경우
          if (typeof item === "number") {
            return item;
          }

          // 제공처별 데이터에서 값 추출
          if (typeof item === "object") {
            // Stormglass 자체 데이터 우선
            if (typeof item.sg === "number") {
              return item.sg;
            }

            // 다른 제공처 데이터 사용
            const values = Object.values(item);

            for (const value of values) {
              if (typeof value === "number") {
                return value;
              }
            }
          }

          return null;
        }

        // 날씨 데이터
        const temperature = getValue(
          weatherHour,
          "airTemperature"
        );

        const humidity = getValue(
          weatherHour,
          "humidity"
        );

        const precipitation = getValue(
          weatherHour,
          "precipitation"
        );

        const pressure = getValue(
          weatherHour,
          "pressure"
        );

        const snowDepth = getValue(
          weatherHour,
          "snowDepth"
        );

        const visibility = getValue(
          weatherHour,
          "visibility"
        );

        const uvIndex = getValue(
          weatherHour,
          "uvIndex"
        );

        // 해양 데이터
        const waveHeight = getValue(
          marineHour,
          "waveHeight"
        );

        // 가시거리 m → km 변환
        const visibilityKm =
          visibility === null
            ? null
            : visibility / 1000;

        // 값과 단위 표시
        function formatValue(value, unit = "") {
          if (value === null || value === undefined) {
            return "데이터 없음";
          }

          return `${value} ${unit}`.trim();
        }

        // Console 표에 출력할 데이터
        const result = [
          {
            항목: "위치",
            위도: latitude.toFixed(2),
            경도: longitude.toFixed(2),
            Value: ""
          },
          {
            항목: "조회 시간",
            위도: "",
            경도: "",
            Value: now.toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul"
            })
          },
          {
            항목: "기온",
            위도: "",
            경도: "",
            Value: formatValue(temperature, "°C")
          },
          {
            항목: "습도",
            위도: "",
            경도: "",
            Value: formatValue(humidity, "%")
          },
          {
            항목: "강수량",
            위도: "",
            경도: "",
            Value: formatValue(precipitation, "mm")
          },
          {
            항목: "기압",
            위도: "",
            경도: "",
            Value: formatValue(pressure, "hPa")
          },
          {
            항목: "적설량",
            위도: "",
            경도: "",
            Value: formatValue(snowDepth, "m")
          },
          {
            항목: "가시거리",
            위도: "",
            경도: "",
            Value: formatValue(visibilityKm, "km")
          },
          {
            항목: "UV지수",
            위도: "",
            경도: "",
            Value: formatValue(uvIndex)
          },
          {
            항목: "파도높이",
            위도: "",
            경도: "",
            Value: formatValue(waveHeight, "m")
          }
        ];

        // =================================
        // Console 출력
        // =================================

        console.log("================================");
        console.log("날씨 데이터 조회 성공");
        console.log("================================");

        console.log(
          "현재 위치:",
          latitude.toFixed(2),
          longitude.toFixed(2)
        );

        console.table(result);

        // 원본 데이터 출력
        console.log("날씨 원본 데이터:", weatherData);
        console.log("해양 원본 데이터:", marineData);

        console.log("================================");
        console.log("날씨 데이터 조회 완료");
        console.log("================================");

      } catch (error) {
        console.error(
          "날씨 데이터 조회 오류:",
          error.message
        );
      }
    },

    function (error) {
      console.error(
        "현재 위치를 가져오지 못했습니다:",
        error.message
      );
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}