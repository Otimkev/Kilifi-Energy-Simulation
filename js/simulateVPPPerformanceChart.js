document.addEventListener("DOMContentLoaded", function () {
  // Function to simulate VPP performance and render a Chart.js graph
  function simulateVPPPerformanceChart(canvasId, thermalDisplacement = 40) {
    // Create an array for 24 hours (0 to 23)
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Define base data for EVs and BESS (dummy data based on case study)
    // BESS parameters: total capacity of 50 MWh and VPP utilization of 80%
    const BESS = {
      capacity: 50, // MWh
      vppUtilization: 0.8,
    };
    // Base EV contribution in MWh (dummy constant from case study UI)
    const evBase = 10; // MWh

    // Calculate base contributions for each hour using simple heuristics:
    // - Peak hours (18:00 - 21:00) have higher contributions.
    // - Morning (7:00 - 9:00) has moderate contributions.
    // - Other hours have minimal contributions.
    const bessBase = BESS.capacity * BESS.vppUtilization; // e.g., 50 * 0.8 = 40 MWh

    // EV contribution profile (in MWh)
    let evContrib = hours.map((hour) => {
      if (hour >= 18 && hour <= 21) {
        return evBase * 0.4; // 40% of EV base during peak hours
      } else if (hour >= 7 && hour <= 9) {
        return evBase * 0.2;
      } else {
        return evBase * 0.05;
      }
    });

    // BESS contribution profile (in MWh)
    let bessContrib = hours.map((hour) => {
      if (hour >= 18 && hour <= 21) {
        return bessBase * 0.6; // 60% of BESS base during peak hours
      } else if (hour >= 7 && hour <= 9) {
        return bessBase * 0.2;
      } else {
        return bessBase * 0.05;
      }
    });

    // Total VPP contribution (EV + BESS)
    let totalVPP = hours.map((_, idx) => evContrib[idx] + bessContrib[idx]);

    // Scale contributions by thermal displacement factor (to simulate different operating conditions)
    const scaleFactor = thermalDisplacement / 40;
    evContrib = evContrib.map((val) => val * scaleFactor);
    bessContrib = bessContrib.map((val) => val * scaleFactor);
    totalVPP = totalVPP.map((val) => val * scaleFactor);

    // Simulate effective tariff improvement (affordability)
    // Assume baseline peak tariff is $0.15/kWh.
    // For each MWh contributed by the VPP during peak hours, assume a reduction of 0.0005 $/kWh,
    // up to a maximum reduction of 0.05 $/kWh.
    let effectiveTariff = hours.map((hour) => {
      const baselinePeakTariff = 0.15; // $/kWh
      if (hour >= 18 && hour <= 21) {
        const reduction = Math.min(totalVPP[hour] * 0.0005, 0.05);
        return baselinePeakTariff - reduction;
      }
      // Off-peak tariff remains at a lower constant value (e.g., $0.08/kWh)
      return 0.08;
    });

    // Create a dual-axis Chart.js chart
    const ctx = document.getElementById(canvasId).getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: hours.map((hour) => `${hour}:00`),
        datasets: [
          {
            label: "EV Contribution (MWh)",
            data: evContrib,
            borderColor: "rgba(54, 162, 235, 1)",
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            fill: false,
            yAxisID: "y",
          },
          {
            label: "BESS Contribution (MWh)",
            data: bessContrib,
            borderColor: "rgba(255, 159, 64, 1)",
            backgroundColor: "rgba(255, 159, 64, 0.2)",
            fill: false,
            yAxisID: "y",
          },
          {
            label: "Total VPP Contribution (MWh)",
            data: totalVPP,
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            fill: false,
            yAxisID: "y",
          },
          {
            label: "Effective Tariff ($/kWh)",
            data: effectiveTariff,
            borderColor: "rgba(153, 102, 255, 1)",
            backgroundColor: "rgba(153, 102, 255, 0.2)",
            fill: false,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "VPP Performance: EV & BESS Contribution and Effective Tariff",
          },
        },
        scales: {
          y: {
            type: "linear",
            position: "left",
            title: {
              display: true,
              text: "VPP Contribution (MWh)",
            },
          },
          y1: {
            type: "linear",
            position: "right",
            title: {
              display: true,
              text: "Effective Tariff ($/kWh)",
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              // Format the ticks to show three decimal places
              callback: function (value) {
                return value.toFixed(3);
              },
            },
          },
        },
      },
    });
  }

  // Call the function with the ID of the canvas element
  simulateVPPPerformanceChart("vppPerformanceChart-2");
});
