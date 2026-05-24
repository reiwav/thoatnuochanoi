import React from 'react';
import dayjs from 'dayjs';
import { Box, Typography, Stack, Chip, alpha } from '@mui/material';
import { IconCheck, IconMessage2, IconAlertTriangle } from '@tabler/icons-react';
import { getInundationImageUrl } from 'utils/imageHelper';
import { formatDateTime } from 'utils/dataHelper';
import useInundationStore from 'store/useInundationStore';

const getDepthColor = (depth, floodLevels) => {
	if (depth == null || depth === '') return '#757575';
	const numDepth = parseFloat(depth);
	if (isNaN(numDepth)) return '#757575';
	if (numDepth === 0) {
		const normal = floodLevels.find(l => !l.is_flooding);
		return normal?.color || '#10b981';
	}
	const matched = floodLevels.find(l => l.is_flooding && numDepth >= l.min_depth && numDepth < l.max_depth);
	if (matched) return matched.color;
	// Handle edge case above the highest range
	const floodingLevels = floodLevels.filter(l => l.is_flooding);
	if (floodingLevels.length > 0) {
		const sorted = [...floodingLevels].sort((a, b) => b.min_depth - a.min_depth);
		if (numDepth >= sorted[0].min_depth) {
			return sorted[0].color;
		}
	}
	return '#f44336';
};

const getFloodLevel = (depth, floodLevels) => {
	if (depth == null || depth === '') return null;
	const numDepth = parseFloat(depth);
	if (isNaN(numDepth)) return null;
	if (numDepth === 0) {
		const normal = floodLevels.find(l => !l.is_flooding);
		return normal || { name: 'Bình thường', color: '#10b981' };
	}
	const matched = floodLevels.find(l => l.is_flooding && numDepth >= l.min_depth && numDepth < l.max_depth);
	if (matched) return matched;
	const floodingLevels = floodLevels.filter(l => l.is_flooding);
	if (floodingLevels.length > 0) {
		const sorted = [...floodingLevels].sort((a, b) => b.min_depth - a.min_depth);
		if (numDepth >= sorted[0].min_depth) {
			return sorted[0];
		}
	}
	return { name: 'Ngập lụt', color: '#f44336' };
};

export const ReportInfoSection = ({ latest, handleOpenViewer, showPlaceholder }) => {
	if (!latest) return null;
	const isTimelineItem = !!(latest.role_permission || latest.type);
	const hasData = isTimelineItem
		? (latest.role_permission === 'inundation:enterprise_report' || latest.type === 'start')
		: !!latest.enterprise_history_id;
	if (!hasData) {
		if (!showPlaceholder) return null;
		return (
			<Box sx={{ p: 2.5, border: '1.5px dashed', borderColor: 'divider', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140, bgcolor: 'grey.50', textAlign: 'center', height: '100%' }}>
				<Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>
					📍 Báo cáo Hiện trường / Địa bàn
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>Chưa có báo cáo</Typography>
			</Box>
		);
	}

	const floodLevels = useInundationStore(state => state.floodLevels);
	const color = getDepthColor(latest.depth, floodLevels);

	return (
		<Box sx={{ p: 1.2, bgcolor: alpha(color, 0.04), borderRadius: 1.5, border: '1px solid', borderColor: alpha(color, 0.1), mb: 1 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
				<Typography variant="caption" sx={{ fontWeight: 900, color: color, textTransform: 'uppercase', fontSize: '0.7rem' }}>
					📍 Báo cáo Địa bàn:
				</Typography>
				{latest.ent_updated_at && (
					<Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 700 }}>
						🕒 {dayjs(latest.ent_updated_at * 1000).format('HH:mm DD/MM')}
					</Typography>
				)}
			</Stack>

			<Stack direction="row" spacing={1} sx={{ mb: 1.5 }} alignItems="center">
				<Box sx={{
					px: 1, py: 0.2,
					bgcolor: 'background.paper',
					border: '1px solid',
					borderColor: 'divider',
					borderRadius: 1,
					display: 'flex',
					alignItems: 'center'
				}}>
					<Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: 'text.primary' }}>
						{latest.length || '?'} <span style={{ color: '#aaa', fontSize: '0.7rem', margin: '0 2px' }}>x</span>
						{latest.width || '?'} <span style={{ color: '#aaa', fontSize: '0.7rem', margin: '0 2px' }}>x</span>
						<span style={{ color: color }}>{latest.depth || 0}</span>
					</Typography>
				</Box>
				<Chip
					label={latest.traffic_status || 'Bình thường'}
					size="small"
					variant="contained"
					sx={{
						fontWeight: 800,
						borderRadius: 1,
						bgcolor: color,
						height: 24,
						fontSize: '0.7rem',
						px: 0.5
					}}
				/>
			</Stack>

			{latest.description && (
				<Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
					{latest.description}
				</Typography>
			)}

			{latest?.images?.filter(img => !!img).length > 0 && (
				<Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
					{latest.images.filter(img => !!img).map((img, i) => (
						<Box
							key={i} component="img" src={getInundationImageUrl(img)}
							onClick={(e) => { e.stopPropagation(); handleOpenViewer?.(latest.images.filter(i => !!i), i); }}
							sx={{ width: 60, height: 60, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'secondary.light', '&:hover': { borderColor: 'secondary.main', transform: 'scale(1.05)' }, transition: 'all 0.2s' }}
						/>
					))}
				</Box>
			)}

			{latest?.review_comment && (
				<Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
					<ReviewCommentSection latest={latest} />
				</Box>
			)}
		</Box>
	);
};

export const SurveyInfoSection = ({ latest, handleOpenViewer, showPlaceholder }) => {
	const isTimelineItem = !!(latest?.role_permission || latest?.type);
	const hasData = isTimelineItem
		? (latest?.role_permission === 'inundation:survey')
		: !!latest?.survey_history_id;
	if (!hasData) {
		if (!showPlaceholder) return null;
		return (
			<Box sx={{ p: 2.5, border: '1.5px dashed', borderColor: 'divider', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140, bgcolor: 'grey.50', textAlign: 'center', height: '100%' }}>
				<Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>
					⚡️ TK Giám sát / KSTK
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>Chưa có báo cáo</Typography>
			</Box>
		);
	}
	const floodLevels = useInundationStore(state => state.floodLevels);
	const depthColor = getDepthColor(latest.survey_d, floodLevels);

	return (
		<Box sx={{ p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2, border: '1px solid', borderColor: 'primary.main', mb: 1 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
				<Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', textTransform: 'uppercase' }}>
					⚡️ TK Giám sát:
				</Typography>
				<Stack direction="row" spacing={0.5} alignItems="center">
					{latest.survey_updated_at && (
						<Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 700, mr: 0.5 }}>
							🕒 {dayjs(latest.survey_updated_at * 1000).format('HH:mm DD/MM')}
						</Typography>
					)}
					{latest.survey_checked && (
						<Chip
							label="ĐÃ KIỂM TRA"
							size="small"
							color="success"
							sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900 }}
						/>
					)}
				</Stack>
			</Box>
			<Stack direction="row" spacing={1} sx={{ mb: 1.5 }} alignItems="center">
				{(latest.survey_d != null || latest.survey_r || latest.survey_s) && (
					<Box sx={{
						px: 1, py: 0.2,
						bgcolor: 'background.paper',
						border: '1px solid',
						borderColor: 'primary.light',
						borderRadius: 1,
						display: 'flex',
						alignItems: 'center'
					}}>
						<Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'text.primary' }}>
							{latest.survey_s || '?'} <span style={{ color: '#aaa', fontSize: '0.65rem', margin: '0 2px' }}>x</span>
							{latest.survey_r || '?'} <span style={{ color: '#aaa', fontSize: '0.65rem', margin: '0 2px' }}>x</span>
							<span style={{ color: depthColor }}>{latest.survey_d != null ? latest.survey_d : 0}</span>
						</Typography>
					</Box>
				)}
				{(() => {
					const lvl = getFloodLevel(latest.survey_d, floodLevels);
					if (!lvl) return null;
					return (
						<Chip
							label={lvl.name}
							size="small"
							variant="contained"
							sx={{
								fontWeight: 800,
								borderRadius: 1,
								bgcolor: lvl.color,
								color: '#fff',
								height: 24,
								fontSize: '0.7rem',
								px: 0.5
							}}
						/>
					);
				})()}
			</Stack>
			{latest.survey_note && <Typography variant="body2" sx={{ fontWeight: 600 }}>{latest.survey_note}</Typography>}
			{latest?.survey_images?.filter(img => !!img).length > 0 && (
				<Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
					{latest.survey_images.filter(img => !!img).map((img, i) => (
						<Box
							key={i} component="img" src={getInundationImageUrl(img)}
							onClick={(e) => { e.stopPropagation(); handleOpenViewer?.(latest.survey_images.filter(i => !!i), i); }}
							sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'primary.main' }}
						/>
					))}
				</Box>
			)}
		</Box>
	);
};

export const MechInfoSection = ({ latest, handleOpenViewer, showPlaceholder }) => {
	const isTimelineItem = !!(latest?.role_permission || latest?.type);
	const hasData = isTimelineItem
		? (latest?.role_permission === 'inundation:mechanic')
		: !!latest?.mech_history_id;
	if (!hasData) {
		if (!showPlaceholder) return null;
		return (
			<Box sx={{ p: 2.5, border: '1.5px dashed', borderColor: 'divider', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140, bgcolor: 'grey.50', textAlign: 'center', height: '100%' }}>
				<Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>
					⚙️ XN Cơ giới / XNCG
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>Chưa có báo cáo</Typography>
			</Box>
		);
	}
	const floodLevels = useInundationStore(state => state.floodLevels);
	const depthColor = getDepthColor(latest.mech_d, floodLevels);

	return (
		<Box sx={{ p: 1.5, bgcolor: 'secondary.lighter', borderRadius: 2, border: '1px solid', borderColor: 'secondary.main', mb: 1 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
				<Typography variant="caption" sx={{ fontWeight: 900, color: 'secondary.main', textTransform: 'uppercase' }}>
					⚙️ XN Cơ giới:
				</Typography>
				<Stack direction="row" spacing={0.5} alignItems="center">
					{latest.mech_updated_at && (
						<Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 700, mr: 0.5 }}>
							🕒 {dayjs(latest.mech_updated_at * 1000).format('HH:mm DD/MM')}
						</Typography>
					)}
					{latest.mech_checked && (
						<Chip
							label="ĐÃ ỨNG TRỰC"
							size="small"
							color="success"
							sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900 }}
						/>
					)}
				</Stack>
			</Box>
			<Stack direction="row" spacing={1} sx={{ mb: 1.5 }} alignItems="center">
				{(latest.mech_d != null || latest.mech_r || latest.mech_s) && (
					<Box sx={{
						px: 1, py: 0.2,
						bgcolor: 'background.paper',
						border: '1px solid',
						borderColor: 'secondary.light',
						borderRadius: 1,
						display: 'flex',
						alignItems: 'center'
					}}>
						<Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'text.primary' }}>
							{latest.mech_s || '?'} <span style={{ color: '#aaa', fontSize: '0.65rem', margin: '0 2px' }}>x</span>
							{latest.mech_r || '?'} <span style={{ color: '#aaa', fontSize: '0.65rem', margin: '0 2px' }}>x</span>
							<span style={{ color: depthColor }}>{latest.mech_d != null ? latest.mech_d : 0}</span>
						</Typography>
					</Box>
				)}
				{(() => {
					const lvl = getFloodLevel(latest.mech_d, floodLevels);
					if (!lvl) return null;
					return (
						<Chip
							label={lvl.name}
							size="small"
							variant="contained"
							sx={{
								fontWeight: 800,
								borderRadius: 1,
								bgcolor: lvl.color,
								color: '#fff',
								height: 24,
								fontSize: '0.7rem',
								px: 0.5
							}}
						/>
					);
				})()}
			</Stack>
			{latest.mech_note && <Typography variant="body2" sx={{ fontWeight: 600 }}>{latest.mech_note}</Typography>}
			{latest?.mech_images?.filter(img => !!img).length > 0 && (
				<Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
					{latest.mech_images.filter(img => !!img).map((img, i) => (
						<Box
							key={i} component="img" src={getInundationImageUrl(img)}
							onClick={(e) => { e.stopPropagation(); handleOpenViewer?.(latest.mech_images.filter(i => !!i), i); }}
							sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'secondary.main' }}
						/>
					))}
				</Box>
			)}
		</Box>
	);
};

export const ReviewCommentSection = ({ latest }) => {
	if (!latest?.review_comment) return null;

	return (
		<Box sx={{ p: 1, bgcolor: 'error.lighter', borderRadius: 1.5, borderLeft: '3px solid', borderColor: 'error.main' }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
				<Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
					<IconAlertTriangle size={14} /> Nhận xét:
				</Typography>
				{latest.is_review_updated ? (
					<Chip
						label="ĐÃ CẬP NHẬT THEO NHẬN XÉT"
						size="small"
						color="success"
						icon={<IconCheck size={12} />}
						sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900, borderRadius: 1 }}
					/>
				) : (
					latest.needs_correction && (
						<Chip
							label="CHƯA CẬP NHẬT THEO NHẬN XÉT"
							size="small"
							color="error"
							icon={<IconAlertTriangle size={12} />}
							sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900, borderRadius: 1 }}
						/>
					)
				)}
			</Box>
			<Typography variant="caption" sx={{ fontWeight: 600, color: 'error.dark', display: 'block' }}>{latest.review_comment}</Typography>
			{latest.reviewer_name && (
				<Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.disabled', fontStyle: 'italic' }}>
					— {latest.reviewer_name}
				</Typography>
			)}
		</Box>
	);
};

export const KtclInfoSection = ({ latest, handleOpenViewer, showPlaceholder }) => {
	const isTimelineItem = !!(latest?.role_permission || latest?.type);
	const hasData = isTimelineItem
		? (latest?.role_permission === 'inundation:ktcl')
		: !!latest?.ktcl_history_id;
	if (!hasData) {
		if (!showPlaceholder) return null;
		return (
			<Box sx={{ p: 2.5, border: '1.5px dashed', borderColor: 'divider', borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 140, bgcolor: 'grey.50', textAlign: 'center', height: '100%' }}>
				<Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', mb: 1 }}>
					📋 Báo cáo KT-CL / KTCL
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>Chưa có báo cáo</Typography>
			</Box>
		);
	}
	const floodLevels = useInundationStore(state => state.floodLevels);
	const depthColor = getDepthColor(latest.ktcl_d, floodLevels);

	return (
		<Box sx={{ p: 1.5, bgcolor: 'warning.lighter', borderRadius: 2, border: '1px solid', borderColor: 'warning.main', mb: 1 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
				<Typography variant="caption" sx={{ fontWeight: 900, color: 'warning.main', textTransform: 'uppercase' }}>
					📋 Báo cáo KT-CL:
				</Typography>
				<Stack direction="row" spacing={0.5} alignItems="center">
					{latest.ktcl_updated_at && (
						<Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 700, mr: 0.5 }}>
							🕒 {dayjs(latest.ktcl_updated_at * 1000).format('HH:mm DD/MM')}
						</Typography>
					)}
					{latest.ktcl_checked && (
						<Chip
							label="ĐÃ BÁO CÁO"
							size="small"
							color="success"
							sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900 }}
						/>
					)}
				</Stack>
			</Box>
			<Stack direction="row" spacing={1} sx={{ mb: 1.5 }} alignItems="center">
				{(latest.ktcl_d != null || latest.ktcl_r || latest.ktcl_s) && (
					<Box sx={{
						px: 1, py: 0.2,
						bgcolor: 'background.paper',
						border: '1px solid',
						borderColor: 'warning.light',
						borderRadius: 1,
						display: 'flex',
						alignItems: 'center'
					}}>
						<Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'text.primary' }}>
							{latest.ktcl_s || '?'} <span style={{ color: '#aaa', fontSize: '0.65rem', margin: '0 2px' }}>x</span>
							{latest.ktcl_r || '?'} <span style={{ color: '#aaa', fontSize: '0.65rem', margin: '0 2px' }}>x</span>
							<span style={{ color: depthColor }}>{latest.ktcl_d != null ? latest.ktcl_d : 0}</span>
						</Typography>
					</Box>
				)}
				{(() => {
					const lvl = getFloodLevel(latest.ktcl_d, floodLevels);
					if (!lvl) return null;
					return (
						<Chip
							label={lvl.name}
							size="small"
							variant="contained"
							sx={{
								fontWeight: 800,
								borderRadius: 1,
								bgcolor: lvl.color,
								color: '#fff',
								height: 24,
								fontSize: '0.7rem',
								px: 0.5
							}}
						/>
					);
				})()}
			</Stack>
			{latest.ktcl_note && <Typography variant="body2" sx={{ fontWeight: 600 }}>{latest.ktcl_note}</Typography>}
			{latest?.ktcl_images?.filter(img => !!img).length > 0 && (
				<Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
					{latest.ktcl_images.filter(img => !!img).map((img, i) => (
						<Box
							key={i} component="img" src={getInundationImageUrl(img)}
							onClick={(e) => { e.stopPropagation(); handleOpenViewer?.(latest.ktcl_images.filter(i => !!i), i); }}
							sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'warning.main' }}
						/>
					))}
				</Box>
			)}
		</Box>
	);
};
