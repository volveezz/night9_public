export const enum RaidButtons {
	join = "raidButton_action_join",
	leave = "raidButton_action_leave",
	alt = "raidButton_action_alt",
	notify = "raidInChnButton_notify",
	delete = "raidInChnButton_delete",
	deleteConfirm = "raidAddFunc_delete_confirm",
	deleteCancel = "raidAddFunc_delete_cancel",
	transfer = "raidInChnButton_transfer",
	unlock = "raidInChnButton_unlock",
	resend = "raidInChnButton_resend",
	notificationsStart = "raidNotifications_start",
	notificationsShowModal = "raidNotifications_showModal",
	notificationsTime = "raidNotifications_modal_time",
	notificationsConfirmModal = "changeCustomRaidNotifications",
	confirmNotify = "raidAddFunc_notify_confirm",
	editNotify = "raidAddFunc_notify_edit",
	notifyCancel = "raidAddFunc_notify_cancel",
	transitionCancel = "raidCreatorHandler_cancel",
	transitionDelete = "raidCreatorHandler_delete",
	fireteamTrackerCancel = "raidInChnButton_fireteamTracker_cancel",
	fireteamTrackerStart = "raidInChnButton_fireteamTracker_start",
}

export const enum RaidAdditionalFunctional {
	confirm = "raidAddFunc_notify_confirm",
	edit = "raidAddFunc_notify_edit",
	modalEdit = "raidAddFunc_modal_edit",
	modalConfrim = "raidAddFunc_modal_confirm",
	cancel = "raidAddFunc_notify_cancel",
}

export const enum RaidReadinessButtons {
	WillBeReady = "raidReadiness_ready",
	WillBeLate = "raidReadiness_willBeReady",
	WontBeReady = "raidReadiness_wontBeReady",
	ModalLateReason = "modalRaidReadiness_lateReason",
	ModalLateReasonSubmit = "submitedRaidReadiness",
	LateReason = "submitedRaidReadiness_lateReason",
}

export const enum ClanButtons {
	invite = "webhandlerEvent_clan_request",
	modal = "clanJoinEvent_modalBtn",
}

export const enum ClanManagementButtons {
	previous = "clanManagement_previous",
	next = "clanManagement_next",
	promote = "clanManagement_promote",
	demote = "clanManagement_demote",
	kick = "clanManagement_kick",
	cancel = "clanManagement_cancel",
}

export const enum ClanAdminInvitesButtons {
	previous = "clanAdminManagement_previous",
	cancelInvite = "clanAdminManagement_cancelInvite",
	next = "clanAdminManagement_next",
}

export const enum ClanSystemButtons {
	kickById = "clanSystem_kickById_",
	confirmKick = "clanSystem_confirmKick",
	cancelKick = "clanSystem_cancelKick",
}

export const enum ClanJoinButtons {
	SubmitModal = "clanJoinEvent_modal_submit",
	modalUsername = "clanJoinEvent_modal_username",
	modalAge = "clanJoinEvent_modal_age",
	modalMicrophone = "clanJoinEvent_modal_microphone",
	modalPowerlite = "clanJoinEvent_modal_power",
	modalUserInfo = "clanJoinEvent_modal_userInfo",
}

export const enum RegisterButtons {
	register = "initEvent_register",
	why = "initEvent_why",
}

export const enum PatchnoteButtons {
	sendToGods = "patchnoteEvent_sendToGods",
	sendToGodsWithoutButtons = "patchnoteEvent_sendToGodsWithoutButtons",
	sendToPublic = "patchnoteEvent_sendToPublic",
	cancel = "patchnoteEvent_cancel",
}

export const enum AutonameButtons {
	enable = "autoname_enable",
	disable = "autoname_disable",
}

export const enum StatsButton {
	oldEvents = "statsEvent_old_events",
	pinnacle = "statsEvent_pinnacle",
}

export const enum TimezoneButtons {
	selectMenu = "tzEvent_selectmenu",
	button = "timezoneButton",
}

export const enum AdminDMChannelButtons {
	reply = "adminDirectMessageButton_reply",
	delete = "adminDirectMessageButton_delete",
}

export const enum LfgButtons {
	delete = "lfgSystem_delete",
}

export const enum DatabaseCommandButtons {
	Confirm = "db_roles_add_confirm",
	Cancel = "db_roles_add_cancel",
	ChangeName = "db_roles_add_change_name",
}

export const enum TwitterButtons {
	showOriginal = "twitter_showOriginal",
}

export const enum TwitterVoteButtons {
	originalBetter = "twitterVote_originalBetter",
	translationBetter = "twitterVote_translationBetter",
}

export const enum ActivityCustomImage {
	Modal = "activityCustomImage_modal",
	ImageField = "activityCustomImage_imageField",
	ThumbnailField = "activityCustomImage_thumbnailField",
}
