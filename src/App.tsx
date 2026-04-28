import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell,
  LineChart, Line
} from 'recharts';
import './index.css';

const fmt = (v: number | null) =>
  v === null || isNaN(v) ? '-' : v.toLocaleString('zh-TW', { maximumFractionDigits: 0 });

const fmtSigned = (v: number | null) => {
  if (v === null || isNaN(v)) return '-';
  return (v > 0 ? '+' : '') + v.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
};

const fmtPct = (v: number | null) => {
  if (v === null || isNaN(v)) return '-';
  return (v > 0 ? '+' : '') + (v * 100).toFixed(2) + '%';
};

const MONTH_LABELS = ['1月\n1/1~1/31','2月\n2/1~2/28','3月\n3/1~3/31','4月\n4/1~4/30',
  '5月\n5/1~5/31','6月\n6/1~6/30','7月\n7/1~7/31','8月\n8/1~8/31',
  '9月\n9/1~9/30','10月\n10/1~10/31','11月\n11/1~11/30','12月\n12/1~12/31'];

interface MonthlyInput {
  investment: number | null;
  endingAssets: number | null;
}

interface CalcRow {
  month: number;
  begin: number;
  inv: number | null;
  end: number | null;
  profit: number | null;
  rate: number | null;
  hasData: boolean;
}

// Top-6 stat icons (user-provided sprite cuts)
const IC = {
  cash:    '/ic_cash.png',    // 年初資產 / 期末資產
  bag:     '/ic_bag.png',     // 今年投入資金
  shield:  '/ic_shield.png',  // 投資基礎本金
  coins:   '/ic_coins.png',   // 真實投資獲利
  pie:     '/ic_pie.png',     // 總資產增加
  bars:    '/ic_bars.png',    // 期末資產 growth
  growth:  '/ic_growth.png',  // 總資產增加 (right column)
  bank:    '/ic_bank.png',    // 期末資產 (right column)
  calc:    '/ic_calc.png',    // 槓桿 利息
  percent: '/ic_percent.png', // 槓桿 資金成本
  star:    '/ic_star.png',    // 槓桿 貢獻
};

export default function App() {
  const [year, setYear] = useState(() => Number(localStorage.getItem('cfk_year')) || 2026);
  const [initialAssets, setInitialAssets] = useState(() => Number(localStorage.getItem('cfk_initialAssets')) || 0);
  const [loanAmount, setLoanAmount] = useState(() => Number(localStorage.getItem('cfk_loanAmount')) || 0);
  const [annualInterest, setAnnualInterest] = useState(() => Number(localStorage.getItem('cfk_annualInterest')) || 0);
  
  const [monthlyInputs, setMonthlyInputs] = useState<MonthlyInput[]>(() => {
    const saved = localStorage.getItem('cfk_monthlyInputs');
    if (saved) return JSON.parse(saved);
    return Array(12).fill(null).map(() => ({
      investment: null,
      endingAssets: null,
    }));
  });

  // Persistence logic
  useEffect(() => {
    localStorage.setItem('cfk_year', String(year));
    localStorage.setItem('cfk_initialAssets', String(initialAssets));
    localStorage.setItem('cfk_loanAmount', String(loanAmount));
    localStorage.setItem('cfk_annualInterest', String(annualInterest));
    localStorage.setItem('cfk_monthlyInputs', JSON.stringify(monthlyInputs));
  }, [year, initialAssets, loanAmount, annualInterest, monthlyInputs]);

  const loanRate1 = 0.034;
  const loanRate2 = 0.026;

  const setField = (i: number, field: 'investment'|'endingAssets', val: string) => {
    const n = [...monthlyInputs];
    n[i] = { ...n[i], [field]: val==='' ? null : Number(val.replace(/,/g,'')) };
    setMonthlyInputs(n);
  };

  const calc = useMemo(() => {
    let begin = initialAssets;
    let totalInv = 0, totalProfit = 0, lastEnd = initialAssets, validCount = 0;

    const rows: CalcRow[] = [];
    monthlyInputs.forEach((inp, i) => {
      const inv = inp.investment ?? 0;
      const end = inp.endingAssets;
      if (end !== null) {
        validCount++;
        const profit = end - begin - inv;
        const rate = (begin + inv) > 0 ? profit / (begin + inv) : 0;
        const prevBegin = begin;
        begin = end;
        totalInv += inv;
        totalProfit += profit;
        lastEnd = end;
        rows.push({ month: i+1, begin: prevBegin, inv: inp.investment, end, profit, rate, hasData: true });
      } else {
        rows.push({ month: i+1, begin, inv: inp.investment, end: null, profit: null, rate: null, hasData: false });
      }
    });

    const basis = initialAssets + totalInv;
    const totalIncrease = lastEnd - initialAssets;
    const realReturn = basis > 0 ? totalProfit / basis : 0;
    const growthRate = initialAssets > 0 ? (lastEnd / initialAssets) - 1 : 0;
    const totalLoan = loanAmount;
    const periodInterest = (annualInterest / 12) * validCount;
    const capitalCost = basis > 0 ? periodInterest / basis : 0;
    const netReturn = realReturn - capitalCost;

    return { rows, totalInv, basis, totalProfit, lastEnd, totalIncrease, realReturn, growthRate,
             totalLoan, periodInterest, capitalCost, netReturn, validCount };
  }, [initialAssets, monthlyInputs, loanAmount, annualInterest]);

  const chartData = useMemo(() => 
    calc.rows
      .filter(r => r.end !== null)
      .map(r => ({ name: `${r.month}月`, profit: r.profit, endAsset: r.end })),
    [calc.rows]
  );

  return (
    <div className="app-container">

      {/* ── HEADER ── */}
      <div className="header-wrap">
        <div className="header-deco">✦ ✦ ✦</div>
        <div className="header-title">
          <span className="star-icon">☆</span>
          <input className="year-input" type="number" value={year} onChange={e=>setYear(+e.target.value)} />
          歷年投資績效總覽
          <span className="star-icon">☆</span>
        </div>
        <div className="header-period">期間：{year}/01/01 ～ {year}/12/31</div>
      </div>

      {/* ── TOP 6 STATS ── */}
      <div className="top-stats">
        {[
          { title:'年初資產', val: fmt(initialAssets), cls:'text-gold', icon: IC.cash,
            extra: <input className="table-input" style={{textAlign:'center',width:'90px'}} type="text"
              value={initialAssets} onChange={e=>setInitialAssets(Number(e.target.value.replace(/,/g,'')))} /> },
          { title:'今年投入資金', val: fmt(calc.totalInv), cls:'text-gold', icon: IC.bag },
          { title:'投資基礎本金', val: fmt(calc.basis), cls:'text-gold', icon: IC.shield },
          { title:'真實投資獲利', val: fmtSigned(calc.totalProfit),
            cls: calc.totalProfit>=0?'text-positive':'text-negative', icon: IC.coins },
          { title:'總資產增加', val: fmtSigned(calc.totalIncrease),
            cls: calc.totalIncrease>=0?'text-positive':'text-negative', icon: IC.pie },
          { title:'期末資產', val: fmt(calc.lastEnd), cls:'text-gold', icon: IC.bars },
        ].map((s, i) => (
          <div className="stat-box" key={i}>
            <div className="stat-title">{s.title}</div>
            <div className={`stat-value ${s.cls}`}>{s.val}</div>
            <img className="stat-icon" src={s.icon} alt={s.title} />
          </div>
        ))}
      </div>

      {/* ── MIDDLE ── */}
      <div className="middle-grid">

        {/* Left: Monthly Table */}
        <div className="panel">
          <div className="section-header">每月資產變化明細</div>
          <div className="panel-body" style={{padding:'0.5rem'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>期間</th><th>期初資產</th><th>期間投入</th>
                  <th>期末資產</th><th>期間損益</th><th>報酬率</th>
                </tr>
              </thead>
              <tbody>
                {calc.rows.filter((r, i) => {
                  if (i === 0) return true;
                  // Show if previous month has an end value, or if this month has any data
                  return calc.rows[i-1].end !== null || r.end !== null || (r.inv !== null && r.inv !== 0);
                }).map((r) => {
                  const i = r.month - 1;
                  return (
                    <tr key={r.month}>
                      <td>📅 {MONTH_LABELS[i].split('\n')[0]}<br/>
                        <span className="text-muted" style={{fontSize:'0.65rem'}}>{MONTH_LABELS[i].split('\n')[1]}</span>
                      </td>
                      <td>
                        {i === 0 ? (
                          <input className="table-input" type="text" placeholder="0"
                            value={initialAssets === 0 ? '' : String(initialAssets)}
                            onChange={e => setInitialAssets(Number(e.target.value.replace(/,/g,'')))} />
                        ) : (
                          fmt(r.begin)
                        )}
                      </td>
                      <td>
                        <input className="table-input" type="text" placeholder="-"
                          value={r.inv===null?'':String(r.inv)}
                          onChange={e=>setField(i,'investment',e.target.value)} />
                      </td>
                      <td>
                        <input className="table-input" type="text" placeholder="-"
                          value={r.end===null?'':String(r.end)}
                          onChange={e=>setField(i,'endingAssets',e.target.value)} />
                      </td>
                      <td className={r.profit!==null?(r.profit>=0?'text-positive':'text-negative'):''}>
                        {fmtSigned(r.profit)}
                      </td>
                      <td className={r.rate!==null?(r.rate>=0?'text-positive':'text-negative'):''}>
                        {fmtPct(r.rate)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="total-row">
                  <td>總 計<br/><span style={{fontSize:'0.65rem',color:'var(--muted)'}}>1/1~12/31</span></td>
                  <td>{fmt(initialAssets)}<br/><span style={{fontSize:'0.65rem',color:'var(--muted)'}}>(年初)</span></td>
                  <td>{fmt(calc.totalInv)}<br/><span style={{fontSize:'0.65rem',color:'var(--muted)'}}>(今年投入)</span></td>
                  <td>{fmt(calc.lastEnd)}<br/><span style={{fontSize:'0.65rem',color:'var(--muted)'}}>(期末)</span></td>
                  <td className={calc.totalProfit>=0?'text-positive':'text-negative'}>
                    {fmtSigned(calc.totalProfit)}<br/><span style={{fontSize:'0.65rem',color:'var(--muted)'}}>(真實投資獲利)</span>
                  </td>
                  <td className={calc.realReturn>=0?'text-positive':'text-negative'}>
                    {fmtPct(calc.realReturn)}<br/><span style={{fontSize:'0.65rem',color:'var(--muted)'}}>(真實報酬率)</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Highlights + Returns */}
        <div className="highlights-wrap">
          <div className="panel highlights-panel">
            <div className="section-header">績 效 重 點 總 結</div>
            <div className="highlights-inner">
              {[
                { icon: IC.shield, label:'年初資產',     val: fmt(initialAssets),           vcls:'text-gold' },
                { icon: IC.growth, label:'總資產增加',   val: fmtSigned(calc.totalIncrease), vcls:'text-positive' },
                { icon: IC.bag,    label:'今年投入資金', val: fmt(calc.totalInv),            vcls:'text-gold' },
                { icon: IC.coins,  label:'真實投資獲利', val: fmtSigned(calc.totalProfit),   vcls:'text-positive' },
                { icon: IC.shield, label:'投資基礎本金', val: fmt(calc.basis),               vcls:'text-gold' },
                { icon: IC.bank,   label:'期末資產',     val: fmt(calc.lastEnd),             vcls:'text-gold' },
              ].map((h,i) => (
                <div className="highlight-item" key={i}>
                  <img className="highlight-icon-top" src={h.icon} alt={h.label} />
                  <div className="highlight-label">{h.label}</div>
                  <div className={`highlight-val ${h.vcls}`}>{h.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="return-grid">
            <div className="return-box">
              <div className="return-title">真實報酬率</div>
              <div className="return-sub">(年初至今)</div>
              <div className={`return-val ${calc.realReturn>=0?'text-positive':'text-negative'}`}>
                {fmtPct(calc.realReturn)}
              </div>
            </div>
            <div className="return-box">
              <div className="return-title">資產總成長</div>
              <div className="return-sub">(年初至今)</div>
              <div className={`return-val ${calc.growthRate>=0?'text-positive':'text-negative'}`}>
                {fmtPct(calc.growthRate)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── LEVERAGE ── */}
      <div className="panel" style={{borderColor:'rgba(180,30,30,0.6)'}}>
        <div className="section-header" style={{borderColor:'rgba(180,30,30,0.4)'}}>
          槓桿效益分析 <span style={{fontSize:'0.85rem',fontWeight:400}}>(含信貸)</span>
        </div>
        <div className="panel-body" style={{padding:'0.5rem 0'}}>
          <div className="leverage-grid">
            <div className="leverage-cell">
              <div className="leverage-label">貸款總額</div>
              <div className="leverage-val text-gold">
                <input className="inline-input" style={{width:'120px', fontSize:'1.4rem', fontWeight:700}}
                  value={loanAmount} onChange={e=>setLoanAmount(+e.target.value.replace(/,/g,''))} /> 元
              </div>
              <div className="leverage-sublabel">(信貸及各類融資總計)</div>
              <img className="stat-icon" src={IC.coins} alt="coins" style={{width:54,height:54,marginTop:'0.2rem'}}/>
            </div>

            <div className="leverage-cell">
              <div className="leverage-label">平均年利息</div>
              <div className="leverage-val text-gold">
                約 <input className="inline-input" style={{width:'85px', fontSize:'1.4rem', fontWeight:700}}
                  value={annualInterest}
                  onChange={e=>setAnnualInterest(+e.target.value.replace(/,/g,''))} /> 元
              </div>
              <div className="leverage-sublabel">(依本息平均攤還)</div>
              <img src={IC.calc} alt="calculator" style={{width:48,height:48,marginTop:'0.25rem'}}/>
            </div>

            <div className="leverage-cell">
              <div className="leverage-label">資金成本率</div>
              <div className="leverage-sublabel">(期間利息÷投資基礎本金)</div>
              <div className="leverage-val" style={{color:'#60a5fa', fontSize:'1.4rem'}}>
                {(calc.capitalCost*100).toFixed(2)}%
              </div>
              <div className="leverage-detail">
                = {Math.round(calc.periodInterest)} ÷ {fmt(calc.basis)}
              </div>
              <img src={IC.percent} alt="percent" style={{width:46,height:46,marginTop:'0.25rem'}}/>
            </div>

            <div className="leverage-cell">
              <div className="leverage-label">淨報酬率 (含利息)</div>
              <div className="leverage-sublabel">(投資報酬率－資金成本率)</div>
              <div className={`leverage-val ${calc.netReturn>=0?'text-positive':'text-negative'}`} style={{fontSize:'1.4rem'}}>
                {(calc.netReturn*100).toFixed(2)}%
              </div>
              <div className="leverage-detail">
                = {(calc.realReturn*100).toFixed(2)}% ~ {(calc.capitalCost*100).toFixed(2)}%
              </div>
            </div>

            <div className="leverage-cell">
              <div className="leverage-label">槓桿貢獻</div>
              <div className="leverage-sublabel">(對比貸款利率區間)</div>
              <div className="leverage-val text-positive" style={{fontSize:'1rem',lineHeight:1.4}}>
                +{((calc.realReturn-loanRate1)*100).toFixed(2)}% ~<br/>
                +{((calc.realReturn-loanRate2)*100).toFixed(2)}%
              </div>
              <div className="leverage-detail">
                對比 {(loanRate1*100).toFixed(2)}%：+{((calc.realReturn-loanRate1)*100).toFixed(2)}%<br/>
                對比 {(loanRate2*100).toFixed(2)}%：+{((calc.realReturn-loanRate2)*100).toFixed(2)}%
              </div>
              <img src={IC.star} alt="star" style={{width:48,height:48,marginTop:'0.25rem'}}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── BAR CHART ── */}
      <div className="panel">
        <div className="section-header">
          每月損益金額
          <span style={{float:'right',fontSize:'0.72rem',fontWeight:400,letterSpacing:0}}>單位：元</span>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{top:20,right:20,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(210,175,55,0.12)" />
              <XAxis dataKey="name" stroke="#666" tick={{fill:'#888', fontSize:12}} />
              <YAxis stroke="#666" tick={{fill:'#888', fontSize:11}} tickFormatter={v=>(v/10000)+'萬'} />
              <ReTooltip
                contentStyle={{background:'#0d0b05',border:'1px solid #d4af37',borderRadius:4}}
                labelStyle={{color:'#f2c94c'}}
                itemStyle={{color:'#ede8d8'}}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [fmtSigned(v), '損益金額']}
              />
              <Bar dataKey="profit" radius={[3,3,0,0]}>
                {chartData.map((e,i)=>(
                  <Cell key={i} fill={e.profit!==null&&e.profit>=0?'#4ade80':'#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── LINE CHART ── */}
      <div className="panel">
        <div className="section-header">
          資產成長趨勢圖（每月期末數值）
          <span style={{float:'right',fontSize:'0.72rem',fontWeight:400,letterSpacing:0}}>單位：元</span>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{top:20,right:20,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(210,175,55,0.12)" />
              <XAxis dataKey="name" stroke="#666" tick={{fill:'#888', fontSize:12}} />
              <YAxis stroke="#666" tick={{fill:'#888', fontSize:11}}
                domain={['dataMin - 500000','dataMax + 500000']}
                tickFormatter={v=>(v/1000000).toFixed(1)+'M'} />
              <ReTooltip
                contentStyle={{background:'#0d0b05',border:'1px solid #d4af37',borderRadius:4}}
                labelStyle={{color:'#f2c94c'}}
                itemStyle={{color:'#4ade80'}}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [fmt(v), '期末資產']}
              />
              <Line type="monotone" dataKey="endAsset" name="期末資產"
                stroke="#4ade80" strokeWidth={3}
                dot={{r:4,fill:'#4ade80',stroke:'#000',strokeWidth:1}}
                activeDot={{r:7}} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
