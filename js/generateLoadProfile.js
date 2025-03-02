document.addEventListener("DOMContentLoaded", function () {
  // Constants based on the case study
  const CURRENT_PEAK_DEMAND = 150; // MW
  const CURRENT_OFFPEAK_DEMAND = 90; // MW

  // Function to generate a 24-hour daily load profile
  function generateLoadProfile() {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map((hour) => {
      let load = CURRENT_OFFPEAK_DEMAND;

      // Morning ramp (7 AM - 9 AM): rising load toward peak
      if (hour >= 7 && hour <= 9) {
        load =
          CURRENT_OFFPEAK_DEMAND +
          (CURRENT_PEAK_DEMAND - CURRENT_OFFPEAK_DEMAND) * 0.7;
      }
      // Peak load (6 PM - 9 PM)
      else if (hour >= 18 && hour <= 21) {
        load = CURRENT_PEAK_DEMAND;
      }
      // Afternoon moderate load (12 PM - 2 PM)
      else if (hour >= 12 && hour <= 14) {
        load =
          CURRENT_OFFPEAK_DEMAND +
          (CURRENT_PEAK_DEMAND - CURRENT_OFFPEAK_DEMAND) * 0.4;
      }
      // Night low load (11 PM - 5 AM)
      else if (hour >= 23 || hour <= 5) {
        load = CURRENT_OFFPEAK_DEMAND * 0.8;
      }

      return load;
    });
  }

  // Generate the load profile data
  const loadProfile = generateLoadProfile();

  // Create the Chart.js line chart for the daily load profile
  const ctx = document.getElementById("dailyLoadProfileChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: "Load (MW)",
          data: loadProfile,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          fill: true,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Daily Load Profile Based on Kilifi Case Study",
        },
      },
      scales: {
        y: {
          title: {
            display: true,
            text: "Load (MW)",
          },
        },
        x: {
          title: {
            display: true,
            text: "Time of Day",
          },
        },
      },
    },
  });
});
