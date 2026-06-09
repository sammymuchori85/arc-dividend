"use client";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ConnectButton } from "./ConnectButton";

const ADDR = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const ABI = [
  { name: "create", type: "function", stateMutability: "nonpayable", inputs: [{ name: "name", type: "string" }, { name: "hs", type: "address[]" }, { name: "sh", type: "uint256[]" }], outputs: [] },
  { name: "deposit", type: "function", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "claimable", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }, { name: "u", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "getPool", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "owner", type: "address" }, { name: "name", type: "string" }, { name: "totalShares", type: "uint256" }, { name: "totalDeposited", type: "uint256" }, { name: "createdAt", type: "uint256" }] }] },
  { name: "totalPools", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const fmt = (a: string) => `${a.slice(0,6)}...${a.slice(-4)}`;

export default function App() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"view"|"create">("view");
  const [viewId, setViewId] = useState("0");
  const [dep, setDep] = useState("10");
  const [form, setForm] = useState({ name: "", rows: "" });
  const { data: total, refetch: rTotal } = useReadContract({ address: ADDR, abi: ABI, functionName: "totalPools" });
  const { data: p, refetch: rP } = useReadContract({ address: ADDR, abi: ABI, functionName: "getPool", args: [BigInt(viewId||"0")] });
  const { data: claimable, refetch: rC } = useReadContract({ address: ADDR, abi: ABI, functionName: "claimable", args: p && address ? [BigInt(viewId), address] : undefined, query: { enabled: !!p && !!address } });
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });
  useEffect(() => { if(!isSuccess) return; rTotal(); rP(); rC(); reset(); setForm({name:"",rows:""}); setTab("view"); }, [isSuccess]); // eslint-disable-line
  const busy = isPending || isConfirming;
  const parsed = form.rows.split("\n").map(s=>s.trim()).filter(Boolean).map(l=>{const[a,sh]=l.split(/[,\s]+/);return{a,sh};}).filter(r=>r.a?.startsWith("0x")&&r.sh);
  const isOwner = address?.toLowerCase() === p?.owner.toLowerCase();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><span className="text-2xl">💸</span><span className="font-bold text-lg">Arc Dividend</span><span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">{total?.toString() ?? "0"} pools</span></div>
        <ConnectButton />
      </header>
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="text-center"><h1 className="text-4xl font-extrabold bg-gradient-to-br from-green-400 to-emerald-500 bg-clip-text text-transparent">Dividends 💸</h1><p className="text-gray-400 text-sm mt-1">Distribute USDC to holders pro-rata</p></div>
        {busy && <div className="text-center text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl py-3 animate-pulse">{isPending ? "Confirm in wallet..." : "Processing..."}</div>}
        <div className="flex gap-2">{(["view","create"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${tab===t?"bg-green-500 text-black":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{t==="create"?"Create Pool":"View / Claim"}</button>)}</div>
        {tab === "create" && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-1"><label className="text-xs text-gray-500 uppercase tracking-wider">Pool Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Q1 dividends" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500" /></div>
          <div className="space-y-1"><label className="text-xs text-gray-500 uppercase tracking-wider">address,shares per line</label><textarea value={form.rows} onChange={e=>setForm(f=>({...f,rows:e.target.value}))} rows={5} placeholder={"0x...,100\n0x...,50"} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-green-500 resize-none" /></div>
          <button onClick={()=>writeContract({address:ADDR,abi:ABI,functionName:"create",args:[form.name,parsed.map(r=>r.a) as `0x${string}`[],parsed.map(r=>BigInt(r.sh))]})} disabled={!isConnected||busy||parsed.length===0||!form.name} className="w-full py-3 font-bold rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black hover:opacity-90 disabled:opacity-40">{busy?"...":`Create (${parsed.length} holders)`}</button>
        </div>}
        {tab === "view" && <div className="space-y-4">
          <input value={viewId} onChange={e=>setViewId(e.target.value)} placeholder="Pool ID" type="number" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500" />
          {p && <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-start"><div><h3 className="font-bold text-lg">{p.name}</h3><p className="text-xs text-gray-500">by {fmt(p.owner)} · {p.totalShares.toString()} shares</p></div></div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center"><div className="text-xs text-green-400">Total Distributed</div><div className="text-2xl font-black text-green-300">{formatEther(p.totalDeposited)} USDC</div></div>
            {claimable !== undefined && claimable > 0n && <button onClick={()=>writeContract({address:ADDR,abi:ABI,functionName:"claim",args:[BigInt(viewId)]})} disabled={busy} className="w-full py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 disabled:opacity-40">{busy?"...":`Claim ${formatEther(claimable)} USDC`}</button>}
            {isOwner && <div className="flex gap-2"><input value={dep} onChange={e=>setDep(e.target.value)} type="number" className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none" /><button onClick={()=>writeContract({address:ADDR,abi:ABI,functionName:"deposit",args:[BigInt(viewId)],value:parseEther(dep||"0")})} disabled={busy} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 disabled:opacity-40 text-sm">{busy?"...":"Deposit dividends"}</button></div>}
          </div>}
        </div>}
      </main>
      <footer className="border-t border-gray-800 py-4 text-center text-gray-600 text-xs">Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">Arc Network</a></footer>
    </div>
  );
}
