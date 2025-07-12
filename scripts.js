// Seleciona os elementos do DOM
const fileInput = document.getElementById('fileInput');
const table = document.getElementById('bondTable');
const tbody = table.querySelector('tbody');

// Armazena os dados dos bonds e referência do gráfico
let bondData = [];
let chartInstance = null;

// Evento para carregar o arquivo JSON ou CSV
fileInput.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const ext = file.name.split('.').pop().toLowerCase();

    // Processa arquivos JSON
    if (ext === 'json') {
      try {
        const data = JSON.parse(e.target.result);
        renderTable(data);
      } catch (err) {
        alert('Erro ao processar o arquivo JSON.');
      }
    }
    // Processa arquivos CSV
    else if (ext === 'csv') {
      try {
        const text = e.target.result;
        const rows = text.trim().split('\n');
        const headers = rows[0].split(',');
        const data = rows.slice(1).map(row => {
          const values = row.split(',');
          return {
            Symbol: values[headers.indexOf('Symbol')],
            Price: parseFloat(values[headers.indexOf('Price')]),
            Coupon: parseFloat(values[headers.indexOf('Coupon')]),
            Maturity: values[headers.indexOf('Maturity')]
          };
        });
        renderTable(data);
      } catch (err) {
        alert('Erro ao processar o arquivo CSV.');
      }
    }
  };
  reader.readAsText(file);
});

// Alterna a exibição da explicação dos cálculos
document.getElementById('toggleExplanation').addEventListener('click', () => {
  const box = document.getElementById('explanationBox');
  const button = document.getElementById('toggleExplanation');

  if (box.style.display === 'none') {
    box.style.display = 'block';
    button.textContent = 'Ocultar explicação';
  } else {
    box.style.display = 'none';
    button.textContent = 'Mostrar explicação';
  }
});

// Renderiza a tabela com os dados calculados dos bonds
function renderTable(data) {
  bondData = [];
  const faceValue = 100;
  const today = new Date();
  tbody.innerHTML = '';

  const select = document.getElementById('bondSelect');
  select.innerHTML = '';

  data.forEach(item => {
    // Converte e calcula dados necessários
    const price = parseFloat(item.Price);
    const couponRate = parseFloat(item.Coupon);
    const maturityDate = new Date(item.Maturity);
    const n = (maturityDate - today) / (1000 * 60 * 60 * 24 * 365.25);
    const years = Math.round(n);

    const C = faceValue * (couponRate / 100);
    const F = faceValue;
    const P = price;

    // Calcula YTM (aproximação)
    const ytm = (C + (F - P) / n) / ((F + P) / 2);
    const ytmRate = isFinite(ytm) ? ytm : 0;
    const ytmPercent = isFinite(ytm) ? (ytm * 100).toFixed(2) + '%' : '-';

    // Calcula Current Yield
    const currentYield = (C / P) * 100;
    const currentYieldPercent = isFinite(currentYield) ? currentYield.toFixed(2) + '%' : '-';

    // Calcula Duration (Macaulay)
    let durationNumerator = 0;
    let durationDenominator = 0;
    for (let t = 1; t <= years; t++) {
      const CFt = t === years ? C + F : C;
      const PVCFt = CFt / Math.pow(1 + ytmRate, t);
      durationNumerator += t * PVCFt;
      durationDenominator += PVCFt;
    }
    const duration = durationDenominator > 0 ? (durationNumerator / durationDenominator).toFixed(2) : '-';

    // Adiciona linha na tabela
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.Symbol}</td>
      <td>${item.Price}</td>
      <td>${item.Coupon}</td>
      <td>${item.Maturity}</td>
      <td>${ytmPercent}</td>
      <td>${currentYieldPercent}</td>
      <td>${duration}</td>
    `;
    tbody.appendChild(row);

    // Armazena os dados para o gráfico
    bondData.push({
      symbol: item.Symbol,
      ytm: parseFloat(ytmPercent),
      currentYield: parseFloat(currentYieldPercent),
      duration: parseFloat(duration)
    });

    // Adiciona opções no select para seleção múltipla
    const opt = document.createElement('option');
    opt.value = item.Symbol;
    opt.textContent = item.Symbol;
    select.appendChild(opt);
  });

  table.style.display = 'table';
}

// Evento que atualiza o gráfico conforme seleção
document.getElementById('bondSelect').addEventListener('change', () => {
  const selected = Array.from(document.getElementById('bondSelect').selectedOptions).map(opt => opt.value);
  updateChart(selected);
});

// Atualiza o gráfico com base nos títulos selecionados
function updateChart(selectedSymbols) {
  const labels = [];
  const ytmData = [];
  const yieldData = [];
  const durationData = [];

  // Filtra os dados para os selecionados
  bondData.forEach(bond => {
    if (selectedSymbols.includes(bond.symbol)) {
      labels.push(bond.symbol);
      ytmData.push(bond.ytm);
      yieldData.push(bond.currentYield);
      durationData.push(bond.duration);
    }
  });

  // Configuração do gráfico tipo linha
  const config = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'YTM (%)',
          data: ytmData,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: false,
          tension: 0.3
        },
        {
          label: 'Current Yield (%)',
          data: yieldData,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: false,
          tension: 0.3
        },
        {
          label: 'Duration (anos)',
          data: durationData,
          borderColor: 'rgba(255, 206, 86, 1)',
          backgroundColor: 'rgba(255, 206, 86, 0.2)',
          fill: false,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Indicadores estilo Stock por Bond' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  };

  // Destroi gráfico anterior (se houver) e renderiza novo
  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = document.getElementById('bondChart').getContext('2d');
  chartInstance = new Chart(ctx, config);
}