import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

import { EarningsPoint } from '../types';

export default function EarningsChart({ points }: { points: EarningsPoint[] }) {
  return (
    <div className="card">
      <div className="card__header">
        <h2>Daily Earnings</h2>
        <span className="pill">Last 7 days</span>
      </div>
      <div className="chart-wrap">
        <Line
          data={{
            labels: points.map((point) => point.date.slice(5)),
            datasets: [
              {
                label: 'Platform earnings',
                data: points.map((point) => point.amount),
                borderColor: '#0f766e',
                backgroundColor: 'rgba(15, 118, 110, 0.12)',
                fill: true,
                tension: 0.35,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
            },
          }}
        />
      </div>
    </div>
  );
}
