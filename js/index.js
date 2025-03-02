$(document).ready(function() {
  // Constants from the case study
  const GRID_CAPACITY = 200; // MW
  const CURRENT_PEAK_DEMAND = 150; // MW
  const CURRENT_OFFPEAK_DEMAND = 90; // MW
  const SPINNING_RESERVE = 0.2; // 20%
  
  // Energy mix percentages
  const ENERGY_MIX = {
    hydro: 0.6,
    thermal: 0.3,
    solar: 0.1
  };
  
  // Tariff structure
  const TARIFF = {
    peak: 0.15, // $/kWh
    offPeak: 0.08 // $/kWh
  };
  
  // Electric cooking data
  const ECOOKING = {
    households: 10000,
    powerRating: 1.2, // kW
    sessionsPerDay: 2,
    sessionDuration: 45/60, // hours
    dailyConsumption: 1.8, // kWh per household
    monthlyTotal: 540, // MWh
    timeDistribution: {
      morning: 0.4, // 6AM-9AM
      afternoon: 0.2, // 12PM-2PM
      evening: 0.4  // 6PM-9PM
    },
    shiftWillingness: 0.3 // 30%
  };
  
  // Electric mobility data
  const EMOBILITY = {
    totalVehicles: 1500,
    types: {
      twoWheelers: {count: 800, capacity: 3}, // kWh
      threeWheelers: {count: 500, capacity: 8}, // kWh
      fourWheelers: {count: 200, capacity: 40} // kWh
    },
    chargingSessionsPerDay: 1.5,
    consumption: {
      twoWheelers: 0.02, // kWh/km
      threeWheelers: 0.06, // kWh/km
      fourWheelers: 0.15  // kWh/km
    },
    dailyDistance: {
      twoWheelers: 50, // km
      threeWheelers: 30, // km
      fourWheelers: 80  // km
    },
    dailyDemand: 8.4 // MWh
  };
  
  // BESS data
  const BESS = {
    capacity: 50, // MWh
    efficiency: 0.85, // 85%
    dailyCycles: 1.2,
    vppUtilization: 0.8 // 80%
  };
  
  // Emission data
  const EMISSIONS = {
    currentUse: 1500, // MWh/day
    projectedUse: 1350, // MWh/day
    emissionFactor: 0.6 // kgCO2/kWh
  };
  
  // Load shifting impact from the UI
  const LOAD_SHIFTING = {
    eCookingShift: 12.5, // MW
    evSmartCharging: 8.2, // MW
    bessDischarge: 15.0, // MW
    combinedStrategy: 30.2 // MW
  };

  // Charts storage for global access
  let charts = {};

  // Generate hourly load profile for a typical day
  function generateLoadProfile() {
    const hours = Array.from({length: 24}, (_, i) => i);
    let loadProfile = hours.map(hour => {
      // Base load
      let load = CURRENT_OFFPEAK_DEMAND;
      
      // Morning peak (7-9 AM)
      if (hour >= 7 && hour <= 9) {
        load = CURRENT_OFFPEAK_DEMAND + (CURRENT_PEAK_DEMAND - CURRENT_OFFPEAK_DEMAND) * 0.7;
      }
      // Evening peak (6-9 PM)
      else if (hour >= 18 && hour <= 21) {
        load = CURRENT_PEAK_DEMAND;
      }
      // Afternoon medium load (12-2 PM)
      else if (hour >= 12 && hour <= 14) {
        load = CURRENT_OFFPEAK_DEMAND + (CURRENT_PEAK_DEMAND - CURRENT_OFFPEAK_DEMAND) * 0.4;
      }
      // Night low load (11 PM - 5 AM)
      else if (hour >= 23 || hour <= 5) {
        load = CURRENT_OFFPEAK_DEMAND * 0.8;
      }
      
      return load;
    });
    
    return loadProfile;
  }

  // Generate cooking load profile
  function generateCookingProfile(shiftPercentage = 30) {
    const hours = Array.from({length: 24}, (_, i) => i);
    const totalHouseholds = ECOOKING.households;
    const powerPerHousehold = ECOOKING.powerRating;
    
    // Convert percentage to a decimal between 0 and 1
    const shiftFactor = shiftPercentage / 100;
    
    let cookingProfile = hours.map(hour => {
      let households = 0;
      
      // Morning cooking (6-9 AM)
      if (hour >= 6 && hour <= 8) {
        // Base morning cooking households
        let morningHouseholds = totalHouseholds * ECOOKING.timeDistribution.morning;
        
        // Apply shift factor to move some cooking away from peak
        if (hour === 8) { // Reduce at late morning peak
          households = morningHouseholds * (1 - (0.5 * shiftFactor));
        } else if (hour === 6) { // Increase at early morning
          households = morningHouseholds * (1 + (0.3 * shiftFactor));
        } else {
          households = morningHouseholds;
        }
      }
      // Afternoon cooking (12-2 PM)
      else if (hour >= 12 && hour <= 13) {
        households = totalHouseholds * ECOOKING.timeDistribution.afternoon;
      }
      // Evening cooking (6-9 PM)
      else if (hour >= 18 && hour <= 20) {
        // Base evening cooking households
        let eveningHouseholds = totalHouseholds * ECOOKING.timeDistribution.evening;
        
        // Apply shift factor to move some cooking away from peak
        if (hour === 19) { // Reduce at evening peak
          households = eveningHouseholds * (1 - (0.7 * shiftFactor));
        } else if (hour === 17) { // Increase at pre-peak (adding an hour before typical range)
          households = eveningHouseholds * (0.5 * shiftFactor);
        } else if (hour === 20) { // Increase at post-peak
          households = eveningHouseholds * (1 + (0.2 * shiftFactor));
        } else {
          households = eveningHouseholds;
        }
      }
      // Add some cooking at off-peak times based on shift percentage
      else if (hour === 16 || hour === 10 || hour === 14) {
        households = totalHouseholds * (0.05 * shiftFactor);
      }
      
      return (households * powerPerHousehold) / 1000; // Convert to MW
    });
    
    return cookingProfile;
  }

  // Generate EV charging profile
  function generateEVChargingProfile() {
    const hours = Array.from({length: 24}, (_, i) => i);
    const totalEVDemand = EMOBILITY.dailyDemand; // MWh
    
    let chargingProfile = hours.map(hour => {
      let chargingFactor = 0;
      
      // Morning charging (8-10 AM)
      if (hour >= 8 && hour <= 10) {
        chargingFactor = 0.15;
      }
      // Afternoon charging (1-3 PM)
      else if (hour >= 13 && hour <= 15) {
        chargingFactor = 0.2;
      }
      // Evening charging peak (6-10 PM)
      else if (hour >= 18 && hour <= 22) {
        chargingFactor = 0.5;
      }
      // Night charging (11 PM - 5 AM)
      else if (hour >= 23 || hour <= 5) {
        chargingFactor = 0.15;
      }
      
      return totalEVDemand * chargingFactor;
    });
    
    return chargingProfile;
  }

  // Generate BESS state of charge profile
  function generateBESSProfile() {
    const hours = Array.from({length: 24}, (_, i) => i);
    const maxCapacity = BESS.capacity;
    let stateOfCharge = maxCapacity * 0.5; // Start at 50% charge
    
    let bessProfile = hours.map(hour => {
      // Charge during low demand (1-5 AM)
      if (hour >= 1 && hour <= 5) {
        stateOfCharge = Math.min(stateOfCharge + (maxCapacity * 0.1), maxCapacity);
      }
      // Discharge during morning peak (7-9 AM)
      else if (hour >= 7 && hour <= 9) {
        stateOfCharge = Math.max(stateOfCharge - (maxCapacity * 0.05), 0);
      }
      // Charge during solar peak (10 AM - 2 PM)
      else if (hour >= 10 && hour <= 14) {
        stateOfCharge = Math.min(stateOfCharge + (maxCapacity * 0.05), maxCapacity);
      }
      // Discharge during evening peak (6-9 PM)
      else if (hour >= 18 && hour <= 21) {
        stateOfCharge = Math.max(stateOfCharge - (maxCapacity * 0.1), 0);
      }
      
      return (stateOfCharge / maxCapacity) * 100; // Return as percentage
    });
    
    return bessProfile;
  }

  // Generate VPP contribution profile
  function generateVPPProfile(thermalDisplacement = 40) {
    const hours = Array.from({length: 24}, (_, i) => i);
    
    // Combine BESS and EV for VPP
    const bessContrib = BESS.capacity * BESS.vppUtilization; // MWh
    const evContrib = 10; // MWh (from the UI data)
    const smartLoadContrib = 8; // MWh (from the UI data)
    
    // Scale by thermal displacement percentage
    const scaleFactor = thermalDisplacement / 40; // Normalize to default value
    
    let vppProfile = hours.map(hour => {
      let contribution = 0;
      
      // Most contribution during peak hours (6-9 PM)
      if (hour >= 18 && hour <= 21) {
        contribution = bessContrib * 0.3 + evContrib * 0.3 + smartLoadContrib * 0.3;
      }
      // Medium contribution during morning peak (7-9 AM)
      else if (hour >= 7 && hour <= 9) {
        contribution = bessContrib * 0.2 + evContrib * 0.1 + smartLoadContrib * 0.2;
      }
      // Low contribution during other times
      else {
        contribution = bessContrib * 0.05 + evContrib * 0.05 + smartLoadContrib * 0.05;
      }
      
      return contribution * scaleFactor;
    });
    
    return vppProfile;
  }

  // Generate emission reduction trajectory
  function generateEmissionReduction(thermalDisplacement = 40) {
    const years = [1, 2, 3, 4, 5];
    const baselineEmissions = EMISSIONS.currentUse * EMISSIONS.emissionFactor * 365; // Annual kgCO2
    const yearOneReduction = (EMISSIONS.currentUse - EMISSIONS.projectedUse) * EMISSIONS.emissionFactor * 365;
    
    // Scale by thermal displacement percentage
    const scaleFactor = thermalDisplacement / 40; // Normalize to default value
    
    // Increasing reduction over 5 years
    return years.map(year => {
      return yearOneReduction * (1 + (year - 1) * 0.2) * scaleFactor; // 20% additional reduction each year
    });
  }

  // Calculate LCOE for different scenarios
  function calculateLCOE() {
    // Simplified LCOE calculation
    const currentLCOE = 0.12;
    const optimizedLCOE = 0.09;
    
    return {
      current: currentLCOE,
      optimized: optimizedLCOE,
      reduction: ((currentLCOE - optimizedLCOE) / currentLCOE) * 100
    };
  }

  // Initialize all charts
  function initializeCharts() {
    const loadProfile = generateLoadProfile();
    const cookingProfile = generateCookingProfile();
    const evProfile = generateEVChargingProfile();
    const bessProfile = generateBESSProfile();
    const vppProfile = generateVPPProfile();
    const emissionReduction = generateEmissionReduction();
    
    // Initialize Load Profile Chart
    charts.loadProfileChart = new Chart($("#loadProfileChart"), {
      type: 'line',
      data: {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Base Load (MW)',
          data: loadProfile,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '24-Hour Load Profile'
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Load (MW)'
            }
          }
        }
      }
    });
    
    // Initialize Cooking Distribution Chart
    charts.cookingDistChart = new Chart($("#cookingDistributionChart"), {
      type: 'bar',
      data: {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'E-Cooking Load (MW)',
          data: cookingProfile,
          backgroundColor: 'rgba(255, 159, 64, 0.7)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Load (MW)'
            }
          }
        }
      }
    });
    
    // Initialize EV Charging Chart
    charts.evChargingChart = new Chart($("#evChargingChart"), {
      type: 'bar',
      data: {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'EV Charging (MWh)',
          data: evProfile,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Energy (MWh)'
            }
          }
        }
      }
    });
    
    // Initialize BESS Chart
    charts.bessChart = new Chart($("#bessChart"), {
      type: 'line',
      data: {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'State of Charge (%)',
          data: bessProfile,
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'SoC (%)'
            }
          }
        }
      }
    });
    
    // Initialize Revenue Chart
    charts.revenueChart = new Chart($("#revenueChart"), {
      type: 'bar',
      data: {
        labels: ['Baseline', 'TOU Implementation', 'VPP Integration', 'Full Optimization'],
        datasets: [{
          label: 'Daily Revenue ($)',
          data: [18000, 19500, 20200, 22500],
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Revenue ($)'
            }
          }
        }
      }
    });
    
    // Initialize Load Shifting Chart
    charts.loadShiftingChart = new Chart($("#loadShiftingChart"), {
      type: 'line',
      data: {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Original Load',
          data: loadProfile,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        }, {
          label: 'Optimized Load',
          data: loadProfile.map((load, hour) => {
            // Apply load shifting from peak to off-peak
            if (hour >= 18 && hour <= 21) {
              return load - LOAD_SHIFTING.combinedStrategy / 4;
            } else if ((hour >= 10 && hour <= 14) || (hour >= 0 && hour <= 4)) {
              return load + LOAD_SHIFTING.combinedStrategy / 10;
            }
            return load;
          }),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Load Shifting Impact'
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Load (MW)'
            }
          }
        }
      }
    });
    
    // Initialize Emission Chart
    charts.emissionChart = new Chart($("#emissionChart"), {
      type: 'line',
      data: {
        labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
        datasets: [{
          label: 'CO2 Reduction (tons)',
          data: emissionReduction.map(kg => kg / 1000), // Convert to tons
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Emission Reduction Trajectory'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'CO2 Reduction (tons)'
            }
          }
        }
      }
    });
    
    // Initialize VPP Performance Chart
    charts.vppPerformanceChart = new Chart($("#vppPerformanceChart"), {
      type: 'line',
      data: {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'VPP Contribution (MWh)',
          data: vppProfile,
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Virtual Power Plant Performance'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Energy (MWh)'
            }
          }
        }
      }
    });
  }

  // Update charts based on slider values
  function updateCharts(cookingShiftPercentage, thermalDisplacement) {
    // Update cooking chart
    const newCookingProfile = generateCookingProfile(cookingShiftPercentage);
    charts.cookingDistChart.data.datasets[0].data = newCookingProfile;
    charts.cookingDistChart.update();
    
    // Update VPP performance chart
    const newVppProfile = generateVPPProfile(thermalDisplacement);
    charts.vppPerformanceChart.data.datasets[0].data = newVppProfile;
    charts.vppPerformanceChart.update();
    
    // Update emissions chart
    const newEmissionReduction = generateEmissionReduction(thermalDisplacement);
    charts.emissionChart.data.datasets[0].data = newEmissionReduction.map(kg => kg / 1000);
    charts.emissionChart.update();
    
    // Update load shifting chart based on cooking shift
    const baseLoadProfile = generateLoadProfile();
    const optimizedLoad = baseLoadProfile.map((load, hour) => {
      // Apply load shifting from peak to off-peak
      const peakHours = [18, 19, 20, 21];
      const offPeakHours = [0, 1, 2, 3, 4, 10, 11, 12, 13, 14];
      
      // Scale shift impact by slider value
      const impactFactor = cookingShiftPercentage / 30;
      
      if (peakHours.includes(hour)) {
        return load - (LOAD_SHIFTING.combinedStrategy / 4) * impactFactor;
      } else if (offPeakHours.includes(hour)) {
        return load + (LOAD_SHIFTING.combinedStrategy / 10) * impactFactor;
      }
      return load;
    });
    
    charts.loadShiftingChart.data.datasets[1].data = optimizedLoad;
    charts.loadShiftingChart.update();
  }

  // Handle slider interactions
  $("#cookingShiftSlider").on("input", function() {
    const cookingShiftValue = parseInt($(this).val());
    $(this).next(".slider-value").text(cookingShiftValue + "%");
    
    const thermalDisplacementValue = parseInt($("#thermalDisplacementSlider").val());
    updateCharts(cookingShiftValue, thermalDisplacementValue);
  });
  
  $("#thermalDisplacementSlider").on("input", function() {
    const thermalDisplacementValue = parseInt($(this).val());
    $(this).next(".slider-value").text(thermalDisplacementValue + "%");
    
    const cookingShiftValue = parseInt($("#cookingShiftSlider").val());
    updateCharts(cookingShiftValue, thermalDisplacementValue);
  });

  // Scenario selector interactions
  $(".scenario-option").click(function() {
    $(".scenario-option").removeClass("active");
    $(this).addClass("active");
    
    // Update charts based on selected scenario
    const scenarioName = $(this).find("h3").text();
    
    switch(scenarioName) {
      case "Baseline":
        $("#cookingShiftSlider").val(0).trigger("input");
        $("#thermalDisplacementSlider").val(0).trigger("input");
        break;
      case "TOU Pricing":
        $("#cookingShiftSlider").val(50).trigger("input");
        $("#thermalDisplacementSlider").val(20).trigger("input");
        break;
      case "VPP Integration":
        $("#cookingShiftSlider").val(30).trigger("input");
        $("#thermalDisplacementSlider").val(60).trigger("input");
        break;
      case "Full Optimization":
        $("#cookingShiftSlider").val(80).trigger("input");
        $("#thermalDisplacementSlider").val(80).trigger("input");
        break;
    }

      // Show a simulation completion message
  showNotification("Simulation completed for " + scenarioName + " scenario");
  });

  // Tab interactions
  $(".tab").click(function() {
    $(".tab").removeClass("active");
    $(this).addClass("active");
    // Would update tariff information and charts
  });

  // Run button click handler
  $(".btn").first().click(function() {
    // Run simulation and update charts
    const cookingShiftValue = parseInt($("#cookingShiftSlider").val());
    const thermalDisplacementValue = parseInt($("#thermalDisplacementSlider").val());
    
    // Destroy existing charts to prevent memory leaks
    for (let chart in charts) {
      if (charts[chart] instanceof Chart) {
        charts[chart].destroy();
      }
    }
    
    // Reinitialize charts
    initializeCharts();
    
    // Update with current slider values
    updateCharts(cookingShiftValue, thermalDisplacementValue);
    
    $(this).text("Re-run Simulation");
  });

  // Export button click handler
  $(".btn-secondary").click(function() {
    alert("Report exported (simulation only)");
  });

  // Initialize charts on page load
  initializeCharts();
  
  // Initialize slider values visually
  $("#cookingShiftSlider").next(".slider-value").text($("#cookingShiftSlider").val() + "%");
  $("#thermalDisplacementSlider").next(".slider-value").text($("#thermalDisplacementSlider").val() + "%");

  // Simulate full demand and supply profiles for analysis
  function analyzeSystemPerformance() {
    const cookingShiftValue = parseInt($("#cookingShiftSlider").val());
    const thermalDisplacementValue = parseInt($("#thermalDisplacementSlider").val());
    
    const baseLoadProfile = generateLoadProfile();
    const cookingProfile = generateCookingProfile(cookingShiftValue);
    const evProfile = generateEVChargingProfile();
    const vppProfile = generateVPPProfile(thermalDisplacementValue);
    
    // Combine all loads for total demand
    const totalDemand = baseLoadProfile.map((base, hour) => {
      return base + cookingProfile[hour] + (evProfile[hour] / 1); // Convert MWh to MW assuming 1-hour intervals
    });
    
    // Calculate peak demand and reduction potential
    const peakDemand = Math.max(...totalDemand);
    const peakReductionPotential = LOAD_SHIFTING.combinedStrategy * (cookingShiftValue / 100);
    const optimizedPeak = peakDemand - peakReductionPotential;
    
    // Calculate financial impact
    const peakHours = [18, 19, 20, 21]; // 6-10 PM
    const baseRevenue = totalDemand.reduce((sum, load, hour) => {
      const tariff = peakHours.includes(hour) ? TARIFF.peak : TARIFF.offPeak;
      return sum + (load * tariff);
    }, 0);
    
    // Calculate optimized revenue with load shifting
    const optimizedDemand = totalDemand.map((load, hour) => {
      if (peakHours.includes(hour)) {
        return load - (peakReductionPotential / peakHours.length);
      } else if ((hour >= 10 && hour <= 14) || (hour >= 0 && hour <= 4)) {
        // Shift to solar hours and night hours
        return load + (peakReductionPotential / 10);
      }
      return load;
    });
    
    const optimizedRevenue = optimizedDemand.reduce((sum, load, hour) => {
      const tariff = peakHours.includes(hour) ? TARIFF.peak : TARIFF.offPeak;
      return sum + (load * tariff);
    }, 0);
    
    // Calculate LCOE
    const lcoe = calculateLCOE();
    console.log("LCOE Analysis:", lcoe);
    // Calculate emission reductions
    const dailyEmissionReduction = (EMISSIONS.currentUse - EMISSIONS.projectedUse) * EMISSIONS.emissionFactor * (thermalDisplacementValue / 100);
    const annualEmissionReduction = dailyEmissionReduction * 365;
    const fiveYearReduction = generateEmissionReduction(thermalDisplacementValue).reduce((sum, val) => sum + val, 0);
    
    // Return analysis results
    return {
      demand: {
        peak: peakDemand,
        optimizedPeak: optimizedPeak,
        reduction: peakReductionPotential,
        reductionPercent: (peakReductionPotential / peakDemand) * 100
      },
      financial: {
        baseRevenue: baseRevenue,
        optimizedRevenue: optimizedRevenue,
        difference: optimizedRevenue - baseRevenue,
        percentChange: ((optimizedRevenue - baseRevenue) / baseRevenue) * 100
      },
      vpp: {
        peakContribution: Math.max(...vppProfile),
        averageContribution: vppProfile.reduce((sum, val) => sum + val, 0) / 24,
        costSavings: peakReductionPotential * TARIFF.peak
      },
      emissions: {
        dailyReduction: dailyEmissionReduction,
        annualReduction: annualEmissionReduction,
        fiveYearTotal: fiveYearReduction
      },
      lcoe: lcoe
    };
  }

  function showNotification(message) {
    // Create notification element if it doesn't exist
    if ($("#notification").length === 0) {
      $("body").append('<div id="notification" style="position: fixed; bottom: 20px; right: 20px; background-color: #4CAF50; color: white; padding: 16px; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 1000; display: none;"></div>');
    }
    
    // Show notification with message
    $("#notification").text(message).fadeIn().delay(3000).fadeOut();
  }

  // Run initial analysis and log results (would be displayed in UI)
  const performanceResults = analyzeSystemPerformance();
  console.log("System Performance Analysis:", performanceResults);
});