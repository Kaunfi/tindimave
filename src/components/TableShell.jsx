import React from 'react';


export default function TableShell({ title, rightExtra, footerRight, children }) {
	return (
		<div className="rounded-2xl border border-blue-900 bg-[#0b1120] shadow-sm">
		<div className="flex items-center justify-between px-5 py-4 border-b border-blue-900">
			<h2 className="text-sm font-medium text-blue-100">{title}</h2>
			{rightExtra}
		</div>
		<div className="overflow-x-auto">{children}</div>
			{footerRight && (
			<div className="px-5 py-2 text-right text-[11px] text-blue-400 border-t border-blue-900">
			{footerRight}
		</div>
		)}
		</div>
	);
}