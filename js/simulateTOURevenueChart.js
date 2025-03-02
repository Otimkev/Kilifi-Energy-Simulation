document.addEventListener("DOMContentLoaded", function () {
  function simulateTOURevenueChart(canvasId) {
    // Define the baseline 24-hour load profile (in MW)
    const baselineLoad = [
      90, 85, 80, 78, 75, 72, 70, 75, 85, 95, 105, 115, 125, 135, 140, 145, 150,
      155, 160, 155, 150, 140, 130, 100,
    ];

    // Create a TOU scenario by applying load shifting:
    // 10% reduction during peak hours (18:00 to 21:00) and 5% increase during off-peak (0:00 to 5:00)
    const touLoad = baselineLoad.map((load, hour) => {
      if (hour >= 18 && hour <= 21) {
        return load * 0.9; // 10% reduction during peak
      } else if (hour >= 0 && hour <= 5) {
        return load * 1.05; // 5% increase during off-peak
      }
      return load;
    });

    // Tariff functions (in $/kWh)
    // Baseline tariffs: peak at $0.15, off-peak at $0.08
    const baselineTariff = (hour) => (hour >= 18 && hour <= 21 ? 0.15 : 0.08);
    // TOU scenario tariffs: slightly reduced peak and off-peak rates
    const touTariff = (hour) => (hour >= 18 && hour <= 21 ? 0.14 : 0.07);

    // Function to calculate hourly revenue (load in MW * tariff in $/kWh)
    // Assuming each hour the load (MW) equals energy (MWh)
    function calculateHourlyRevenue(loadArray, tariffFn) {
      return loadArray.map((load, hour) => load * tariffFn(hour));
    }

    // Calculate hourly revenues
    const revenueBaselineHourly = calculateHourlyRevenue(
      baselineLoad,
      baselineTariff
    );
    const revenueTOUHourly = calculateHourlyRevenue(touLoad, touTariff);

    // Calculate total daily revenue by summing hourly revenue
    const totalRevenueBaseline = revenueBaselineHourly.reduce(
      (sum, rev) => sum + rev,
      0
    );
    const totalRevenueTOU = revenueTOUHourly.reduce((sum, rev) => sum + rev, 0);
    const revenueDifference = totalRevenueTOU - totalRevenueBaseline;
    const revenueDifferencePercent =
      (revenueDifference / totalRevenueBaseline) * 100;

    // Create the Chart.js bar chart on the provided canvas
    const ctx = document.getElementById(canvasId).getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Baseline Revenue", "TOU Revenue"],
        datasets: [
          {
            label: "Total Daily Revenue ($)",
            data: [totalRevenueBaseline.toFixed(2), totalRevenueTOU.toFixed(2)],
            backgroundColor: [
              "rgba(255, 159, 64, 0.7)",
              "rgba(54, 162, 235, 0.7)",
            ],
            borderColor: ["rgba(255, 159, 64, 1)", "rgba(54, 162, 235, 1)"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `TOU Financial Viability: Revenue ${
              revenueDifference >= 0 ? "Increase" : "Decrease"
            } of ${Math.abs(revenueDifferencePercent).toFixed(2)}%`,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Revenue ($)",
            },
          },
        },
      },
    });
  }

  // Call the function with the ID of the canvas element
  simulateTOURevenueChart("trafficrevenueChart");
});
