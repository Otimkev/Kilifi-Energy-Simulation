document.addEventListener("DOMContentLoaded", function () {
  // Example original 24-hour load profile in MW
  const originalLoad = [
    90, 85, 80, 78, 75, 72, 70, 75, 85, 95, 105, 115, 125, 135, 140, 145, 150,
    155, 160, 155, 150, 140, 130, 100,
  ];

  // Simulate load shifting by reducing peak demand (e.g., hours 18-21)
  // and slightly increasing off-peak hours to accommodate shifted load.
  const shiftedLoad = originalLoad.map((load, hour) => {
    // Assume peak hours between 18:00 (hour 18) and 21:00 (hour 21)
    if (hour >= 18 && hour <= 21) {
      return load - 15; // Reduce peak load by 15 MW
    } else if (hour === 16 || hour === 22) {
      return load + 5; // Increase off-peak load by 5 MW to reflect shifted demand
    }
    return load;
  });

  // Calculate hourly revenue based on tariff: $0.15/kWh during peak hours and $0.08/kWh off-peak.
  // Note: For simplicity, we assume the load (in MW) persists for 1 hour, so MWh = MW.
  const calculateRevenue = (loadArray) => {
    return loadArray.map((load, hour) => {
      const tariff = hour >= 18 && hour <= 21 ? 0.15 : 0.08;
      return load * tariff;
    });
  };

  const revenueOriginal = calculateRevenue(originalLoad);
  const revenueShifted = calculateRevenue(shiftedLoad);

  // Create a dual-axis Chart.js line chart
  const ctx = document.getElementById("loadShiftingPotentialGraph").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: [...Array(24).keys()].map((hour) => hour + ":00"),
      datasets: [
        {
          label: "Original Load (MW)",
          data: originalLoad,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          yAxisID: "y",
          fill: false,
        },
        {
          label: "Shifted Load (MW)",
          data: shiftedLoad,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          yAxisID: "y",
          fill: false,
        },
        {
          label: "Original Revenue ($/hr)",
          data: revenueOriginal,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          yAxisID: "y1",
          fill: false,
        },
        {
          label: "Shifted Revenue ($/hr)",
          data: revenueShifted,
          borderColor: "rgba(153, 102, 255, 1)",
          backgroundColor: "rgba(153, 102, 255, 0.2)",
          yAxisID: "y1",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
        maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Load Shifting Potential and Economic Impact",
        },
      },
      scales: {
        y: {
          type: "linear",
          position: "left",
          title: {
            display: true,
            text: "Load (MW)",
          },
        },
        y1: {
          type: "linear",
          position: "right",
          title: {
            display: true,
            text: "Revenue ($/hr)",
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  });
});
