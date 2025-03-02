document.addEventListener("DOMContentLoaded", function () {
// Function to simulate LCOE calculations and plot the impact of electric cooking and mobility
function simulateLCOEChart(canvasId) {
    const baselineLCOE = 0.12; // $/kWh baseline
    const maxReductionCooking = 0.015; // max reduction from electric cooking at 100%
    const maxReductionEV = 0.015;      // max reduction from electric mobility at 100%
    
    // Arrays to store data points
    const adoptionLevels = [];
    const cookingOnly = [];
    const evOnly = [];
    const combined = [];
    
    // Simulate adoption levels from 0% to 100% in 10% increments
    for (let i = 0; i <= 100; i += 10) {
      adoptionLevels.push(i + '%');
      
      // Calculate LCOE for each scenario based on adoption level
      const cookingLCOE = baselineLCOE - (i / 100) * maxReductionCooking;
      const evLCOE = baselineLCOE - (i / 100) * maxReductionEV;
      const combinedLCOE = baselineLCOE - (i / 100) * (maxReductionCooking + maxReductionEV);
      
      cookingOnly.push(Number(cookingLCOE.toFixed(3)));
      evOnly.push(Number(evLCOE.toFixed(3)));
      combined.push(Number(combinedLCOE.toFixed(3)));
    }
  
    // Create the Chart.js line chart
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: adoptionLevels,
        datasets: [
          {
            label: 'Electric Cooking Only',
            data: cookingOnly,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: false,
            tension: 0.1
          },
          {
            label: 'Electric Mobility Only',
            data: evOnly,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: false,
            tension: 0.1
          },
          {
            label: 'Combined Interventions',
            data: combined,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: false,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'LCOE Impact: Electric Cooking and Mobility'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Adoption Level (%)'
            }
          },
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'LCOE ($/kWh)'
            },
            suggestedMin: 0.08,
            suggestedMax: 0.12
          }
        }
      }
    });
  }
  
  // Call the function with the ID of the canvas element
  simulateLCOEChart('lcoeChart');
});