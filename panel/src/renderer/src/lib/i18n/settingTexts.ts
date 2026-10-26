// Name and plain-language explanation of every config key, in both languages.
export interface SettingText {
  label: string
  note: string
}

export const SETTING_TEXTS: Record<string, Record<'vi' | 'en', SettingText>> = {
  cdpPort: {
    vi: {
      label: 'Cổng kết nối Zalo',
      note: 'Số cổng mà Zalo Desktop được mở ra để bot điều khiển (cổng gỡ lỗi, debug port). Chỉ đổi khi chương trình khác đã chiếm cổng này, rồi khởi động lại các bot.'
    },
    en: {
      label: 'Zalo connection port',
      note: 'The port Zalo Desktop is opened on so the bots can control it (debug port). Change it only if another program already uses this port, then restart the bots.'
    }
  },
  zaloExePath: {
    vi: {
      label: 'Đường dẫn Zalo.exe',
      note: 'Vị trí file Zalo.exe trên máy. Bot tự dò bản Zalo mới nhất, chỉ điền tay khi tự dò sai.'
    },
    en: {
      label: 'Path to Zalo.exe',
      note: 'Where Zalo.exe is on this computer. The bot finds the newest Zalo itself; fill this in only if that detection is wrong.'
    }
  },
  autoLaunchZalo: {
    vi: {
      label: 'Tự mở lại Zalo khi cần',
      note: 'Nếu Zalo chưa mở ở chế độ cho bot điều khiển, bot tự tắt rồi mở lại (đăng nhập không mất). Đặt false thì bot chỉ báo lỗi, bạn tự mở Zalo.'
    },
    en: {
      label: 'Reopen Zalo automatically',
      note: 'If Zalo is not open in the mode the bots need, the bot closes and reopens it (your login is kept). With false the bot only reports an error and you open Zalo yourself.'
    }
  },
  dataDir: {
    vi: {
      label: 'Thư mục dữ liệu',
      note: 'Nơi lưu tin đã lấy về (mỗi nhóm một file JSON) và các file trạng thái của bot.'
    },
    en: {
      label: 'Data folder',
      note: "Where the collected messages (one JSON file per group) and the bots' state files are stored."
    }
  },
  statusExportDir: {
    vi: {
      label: 'Thư mục xuất báo cáo',
      note: 'Thư mục gốc chứa file báo cáo, mỗi ngày một thư mục con (yyMM/yyMMdd). Phải là đường dẫn tuyệt đối; đổi thì file cũ không tự chuyển sang. Khởi động lại bot:runner và bot:total.'
    },
    en: {
      label: 'Report output folder',
      note: 'Root folder for report files, with one subfolder per day (yyMM/yyMMdd). Must be an absolute path; old files are not moved when you change it. Restart bot:runner and bot:total.'
    }
  },
  excelMaxColumnWidth: {
    vi: {
      label: 'Bề rộng cột tối đa của file báo cáo',
      note: 'Cột tự nới theo chữ trong dòng dữ liệu tới tối đa bấy nhiêu ký tự (không hẹp hơn mẫu); dài hơn thì bị cắt ở mép cột, không xuống dòng (riêng 4 báo cáo kỹ thuật vẫn xuống dòng). Nhận từ 10 đến 255. Khởi động lại bot:runner và bot:total.'
    },
    en: {
      label: 'Maximum column width of report files',
      note: 'A column widens to fit the text in its data rows, up to this many characters (never narrower than the template); longer text is cut at the column edge and does not wrap (the 4 technical sheets still wrap). From 10 to 255. Restart bot:runner and bot:total.'
    }
  },
  reportSets: {
    vi: {
      label: 'Người phụ trách và báo cáo của họ',
      note: 'Mỗi người phụ trách có một bộ: tên thư mục riêng (id) và danh sách loại báo cáo họ nhận (reports). Cấu hình sai thì bộ hoặc mục sai bị tắt và báo lỗi, bot không dừng.'
    },
    en: {
      label: 'People in charge and their reports',
      note: 'Each person has one set: their own folder name (id) and the list of report types they receive (reports). A wrong entry is switched off and reported as an error; the bots keep running.'
    }
  },
  targets: {
    vi: {
      label: 'Danh sách nhóm theo dõi',
      note: 'Tên nhóm Zalo đúng như hiện ở thanh bên của Zalo. Chỉ nhóm nằm trong danh sách mới được theo dõi, lấy tin và trả lời. Đổi tên nhóm trong Zalo thì phải sửa ở đây.'
    },
    en: {
      label: 'Groups to watch',
      note: "Group names exactly as shown in Zalo's sidebar. Only groups on this list are watched, read and answered. If you rename a group in Zalo, change it here too."
    }
  },
  groupAliases: {
    vi: {
      label: 'Nhóm thử đọc như nhóm thật',
      note: 'Cho một nhóm thử được đọc như một nhóm trường thật để chạy thử quy trình. Chỉ để thử: dòng của nhóm thử nằm trong file Excel thật, thử xong nên xóa. Nhóm thử phải có trong danh sách theo dõi.'
    },
    en: {
      label: 'Test group read as a real one',
      note: 'Makes a test group be read as a real school group so you can try the whole process. For testing only: its row lands in the real Excel file, so remove it afterwards. The test group must be on the watch list.'
    }
  },
  recoveryIgnoreTargets: {
    vi: {
      label: 'Nhóm bỏ qua khi khôi phục',
      note: 'Nhóm không bao giờ gửi báo cáo buổi dạy (nhóm thử). Khôi phục không coi nhóm này là thiếu báo cáo và không lấy lại tin của nó. Phải là nhóm có trong danh sách theo dõi.'
    },
    en: {
      label: 'Groups skipped in recovery',
      note: 'Groups that never send lesson reports (test groups). Recovery does not count them as missing a report and does not re-read them. They must be on the watch list.'
    }
  },
  sinceTs: {
    vi: {
      label: 'Lấy tin từ giờ',
      note: 'Chỉ giữ tin gửi từ giờ này trở đi và ngừng cuộn khi qua mốc; để trống là không giới hạn. Chỉ tính một lần lúc bot khởi động; bot:runner không dùng giá trị này mà tự tính lại từ đầu ngày.'
    },
    en: {
      label: 'Collect messages from',
      note: 'Keeps only messages sent from this time on and stops scrolling once it passes it; empty means no limit. Worked out once when the bot starts; bot:runner ignores it and recalculates from the start of the day.'
    }
  },
  untilTs: {
    vi: {
      label: 'Lấy tin đến giờ',
      note: 'Chỉ giữ tin gửi đến giờ này; để trống là đến lúc chạy. Chỉ áp dụng cho bot:scrape chạy tay, bot:runner và khôi phục bỏ qua giá trị này.'
    },
    en: {
      label: 'Collect messages until',
      note: 'Keeps only messages sent up to this time; empty means up to the moment of the run. Applies only to a manual bot:scrape; bot:runner and recovery ignore it.'
    }
  },
  targetMessageCount: {
    vi: {
      label: 'Số tin tối đa mỗi lần lấy',
      note: 'Giới hạn an toàn số tin lấy về cho mỗi nhóm trong mỗi lần cào dữ liệu (scrape). Nhóm nhắn nhiều thì tăng lên, đổi lại mỗi lần lấy tin lâu hơn.'
    },
    en: {
      label: 'Max messages per run',
      note: 'Safety limit on how many messages are read per group in one scrape. Raise it for very busy groups; each run then takes longer.'
    }
  },
  scrollDelayMs: {
    vi: {
      label: 'Nghỉ giữa các lần cuộn',
      note: 'Bot nghỉ một khoảng ngẫu nhiên (mili giây) giữa hai lần cuộn để không dồn dập vào Zalo: gồm mức ngắn nhất (min) và dài nhất (max). Giảm thì lấy tin nhanh hơn nhưng dễ làm Zalo giật.'
    },
    en: {
      label: 'Pause between scrolls',
      note: 'The bot waits a random time (milliseconds) between two scrolls so it does not hammer Zalo: a shortest (min) and a longest (max) value. Lower values are faster but can make Zalo stutter.'
    }
  },
  'watch.heartbeatSeconds': {
    vi: {
      label: 'Nhịp tim bot theo dõi',
      note: "Bao lâu bot:watch ghi một dấu 'tôi còn sống' (nhịp tim, heartbeat); bot:runner cũng dùng nhịp này. Nhỏ hơn thì phát hiện bot chết nhanh hơn nhưng ghi file nhiều hơn."
    },
    en: {
      label: 'Watch bot heartbeat',
      note: "How often bot:watch writes an 'I am alive' mark (heartbeat); bot:runner uses it too. Smaller means a dead bot is noticed sooner, but the file is written more often."
    }
  },
  'watch.deadAfterSeconds': {
    vi: {
      label: 'Coi bot đã chết sau',
      note: 'Quá số giây này không thấy nhịp tim thì coi bot đã chết (bot:chat cũng dùng mốc này). Nên bằng ít nhất 3 lần nhịp tim; dưới 2 lần bị từ chối.'
    },
    en: {
      label: 'Treat bot as dead after',
      note: 'If no heartbeat is seen for this many seconds the bot is considered dead (bot:chat uses this limit too). Should be at least 3 heartbeats; under 2 is rejected.'
    }
  },
  'watch.minBlindSeconds': {
    vi: {
      label: 'Bỏ qua khoảng mù ngắn',
      note: "Khoảng thời gian bot:watch 'mù' (không nhận được tin mới theo thời gian thực) ngắn hơn số giây này được coi là nhiễu lúc khởi động, không ghi là một lần gián đoạn."
    },
    en: {
      label: 'Ignore short blind spells',
      note: "A period when bot:watch is 'blind' (not receiving live messages) shorter than this is treated as start-up noise and is not recorded as a gap."
    }
  },
  'watch.probeSeconds': {
    vi: {
      label: 'Chu kỳ kiểm tra Zalo',
      note: 'Bao lâu bot:watch kiểm tra xem Zalo còn trả lời trên cổng gỡ lỗi không. Hai lần liên tiếp không trả lời thì bot tự tắt, mở lại Zalo và kết nối lại.'
    },
    en: {
      label: 'Zalo health-check interval',
      note: 'How often bot:watch checks that Zalo still answers on the debug port. After two failed checks in a row the bot closes Zalo, reopens it and reconnects.'
    }
  },
  'watch.silenceRestartMinutes': {
    vi: {
      label: 'Mở lại Zalo khi im lặng',
      note: 'Quá số phút này không nhận được khung dữ liệu WebSocket nào từ Zalo thì tự mở lại Zalo; 0 là tắt (mặc định). Chỉ bật khi chắc Zalo ban đêm vẫn gửi khung nhịp, nếu không Zalo bị mở lại nhầm.'
    },
    en: {
      label: 'Reopen Zalo when silent',
      note: 'If no WebSocket data frame at all arrives from Zalo for this many minutes, Zalo is restarted; 0 means off (default). Turn on only if Zalo still sends keep-alive frames at night, or it restarts for nothing.'
    }
  },
  'watch.reconnectMaxSeconds': {
    vi: {
      label: 'Chờ tối đa khi nối lại',
      note: 'Sau khi mất kết nối, bot chờ lâu dần giữa các lần nối lại (5, 10, 20... giây) nhưng không quá số giây này giữa hai lần thử.'
    },
    en: {
      label: 'Longest wait before reconnecting',
      note: 'After a lost connection the bot waits longer and longer between attempts (5, 10, 20... seconds) but never more than this many seconds between two tries.'
    }
  },
  'runner.quietSeconds': {
    vi: {
      label: 'Chờ yên trước khi lấy tin',
      note: 'Khi hàng chờ (queue) có nhóm, bot:runner đợi nhóm yên lặng ngần này giây kể từ tin mới nhất rồi mới lấy tin, để gom nhiều nhóm vào một lượt. Nhỏ hơn thì chạy sớm hơn nhưng nhiều lượt nhỏ hơn.'
    },
    en: {
      label: 'Quiet time before reading',
      note: 'When a group is in the queue, bot:runner waits until it has been quiet this many seconds after its newest message, so several groups go in one round. Smaller starts sooner but makes more small rounds.'
    }
  },
  'runner.maxWaitSeconds': {
    vi: {
      label: 'Chờ tối đa',
      note: 'Thời gian chờ tối đa tính từ lúc nhóm đầu tiên vào hàng chờ, để nhóm nhắn liên tục không bị hoãn mãi. Phải lớn hơn hoặc bằng thời gian chờ yên.'
    },
    en: {
      label: 'Longest wait',
      note: 'The longest the runner waits, counted from when the first group entered the queue, so a group that keeps chatting is not postponed forever. Must be at least the quiet time.'
    }
  },
  'runner.pollSeconds': {
    vi: {
      label: 'Chu kỳ xem hàng chờ',
      note: 'Bao lâu bot:runner nhìn lại hàng chờ (queue) một lần. Đặt quá nhỏ thì đọc file dồn dập, dễ gặp lỗi trên Windows.'
    },
    en: {
      label: 'Queue check interval',
      note: 'How often bot:runner looks at the queue again. Too small means the file is read constantly, which can cause errors on Windows.'
    }
  },
  'runner.dirtyCheckSeconds': {
    vi: {
      label: 'Chu kỳ kiểm báo cáo chưa dựng',
      note: 'Bao lâu bot:runner kiểm tra xem có báo cáo đã lưu trên đĩa mà chưa được dựng vào Excel (do bot sập hoặc lấy tin tay) để dựng bù.'
    },
    en: {
      label: 'Unbuilt-report check interval',
      note: 'How often bot:runner checks for reports saved on disk but not yet built into Excel (after a crash or a manual run), so they can be built late.'
    }
  },
  'runner.dirtyRetrySeconds': {
    vi: {
      label: 'Thử lại buổi dựng lỗi sau',
      note: 'Khi dựng báo cáo của một buổi bị lỗi, bot:runner đợi ngần này giây mới thử lại, để không thử dồn dập.'
    },
    en: {
      label: 'Retry a failed build after',
      note: "When building one session's report fails, bot:runner waits this many seconds before trying again, so it does not retry in a rush."
    }
  },
  'runner.watchWarmupSeconds': {
    vi: {
      label: 'Chờ sau khi bot theo dõi khởi động',
      note: 'Sau khi bot:watch khởi động (nó tắt và mở lại Zalo), bot:runner không đụng vào Zalo trong ngần này giây. Đặt đủ lâu để bot:watch kết nối xong.'
    },
    en: {
      label: 'Wait after watch bot starts',
      note: 'After bot:watch starts (it closes and reopens Zalo), bot:runner leaves Zalo alone for this many seconds. Set it long enough for bot:watch to finish connecting.'
    }
  },
  'runner.maxConsecutiveFailures': {
    vi: {
      label: 'Số vòng lỗi liên tiếp tối đa',
      note: 'Sau ngần này vòng lỗi liên tiếp (lỗi lấy tin hoặc đồng bộ; lỗi dựng một buổi không tính), bot:runner ngừng tự thử và báo lỗi. Hàng chờ vẫn được giữ.'
    },
    en: {
      label: 'Max failed rounds in a row',
      note: 'After this many failed rounds in a row (reading or syncing errors; a single session build error does not count), bot:runner stops trying by itself and reports an error. The queue is kept.'
    }
  },
  'runner.maxScrapeAttempts': {
    vi: {
      label: 'Số lần thử lại tối đa cho một nhóm',
      note: 'Nhóm bị lỗi khi lấy tin vẫn ở lại hàng chờ và được thử lại ở lượt sau, tối đa ngần này lần tổng cộng, rồi bị bỏ và ghi log. Đặt 1 để bỏ ngay sau lần lỗi đầu.'
    },
    en: {
      label: 'Max attempts per group',
      note: 'A group that fails to be read stays in the queue and is retried in later rounds, up to this many attempts in total, then dropped and logged. With 1 it is dropped after the first failure.'
    }
  },
  'runner.errorRetryMinutes': {
    vi: {
      label: 'Tự thử lại sau lỗi',
      note: 'Sau khi bot:runner ngừng vì lỗi liên tiếp, nó thử lại sau ngần này phút nếu hàng chờ còn việc. 0 là ngừng hẳn, chờ khởi động lại tay.'
    },
    en: {
      label: 'Retry after errors',
      note: 'After bot:runner stops because of repeated errors, it tries again after this many minutes if the queue still has work. 0 means it stays stopped until restarted by hand.'
    }
  },
  'runner.queueKeepDays': {
    vi: {
      label: 'Giữ hàng chờ bao nhiêu ngày',
      note: 'Số ngày giữ file sự kiện của hàng chờ (queue), không tính hôm nay; file cũ hơn bị xóa sau mỗi lần lấy tin. Nhóm đang chờ trong file đã xóa sẽ mất khỏi hàng chờ.'
    },
    en: {
      label: 'Days to keep the queue',
      note: 'How many days of queue event files are kept besides today; older files are deleted after each run. A group waiting in a deleted file drops out of the queue.'
    }
  },
  'recovery.marginMinutes': {
    vi: {
      label: 'Lùi thêm khi khôi phục',
      note: 'Khi lấy bù tin sau lúc bot:watch chết, bot lấy lại từ trước lúc chết ngần này phút để bắt tin đến sát lúc bot sập (không lùi quá đầu buổi).'
    },
    en: {
      label: 'Extra look-back in recovery',
      note: 'When catching up after bot:watch died, the bot re-reads from this many minutes before it died, to catch messages that arrived right before the crash (never earlier than the start of the session).'
    }
  },
  'chat.pollSeconds': {
    vi: {
      label: 'Chu kỳ kiểm hộp thư',
      note: 'Bao lâu bot:chat nhìn hộp thư tin đến một lần. Nhỏ hơn thì trả lời nhanh hơn.'
    },
    en: {
      label: 'Inbox check interval',
      note: 'How often bot:chat looks at its inbox of incoming messages. Smaller means faster replies.'
    }
  },
  'chat.heartbeatSeconds': {
    vi: {
      label: 'Nhịp tim bot chat',
      note: 'Bao lâu bot:chat ghi nhịp tim (heartbeat) để chat:status biết nó còn sống. Mốc coi là chết (coi bot đã chết sau) phải chứa ít nhất 2 nhịp này.'
    },
    en: {
      label: 'Chat bot heartbeat',
      note: "How often bot:chat writes its heartbeat so chat:status knows it is alive. The 'treat bot as dead after' limit must fit at least 2 of these beats."
    }
  },
  'chat.skipBackoffSeconds': {
    vi: {
      label: 'Nghỉ sau khi hoãn gửi',
      note: 'Khi một lần gửi bị hoãn (ô soạn tin đang có chữ dở hoặc chưa mở được nhóm), bot:chat không đụng vào Zalo lại trong ngần này giây.'
    },
    en: {
      label: 'Pause after a postponed send',
      note: 'When a send is postponed (the message box holds half-typed text, or the group could not be opened), bot:chat leaves Zalo alone for this many seconds.'
    }
  },
  'chat.sentLedgerMinutes': {
    vi: {
      label: 'Nhớ tin vừa gửi',
      note: 'bot:chat nhớ các câu vừa gửi trong ngần này phút để bot:watch nhận ra tin dội lại của chính bot. Phải dài hơn cửa sổ nhận tin dội lại.'
    },
    en: {
      label: 'Remember sent messages',
      note: "bot:chat remembers the sentences it just sent for this many minutes so bot:watch can recognise the bot's own echo. Must be longer than the echo window."
    }
  },
  'chat.echoWindowSeconds': {
    vi: {
      label: 'Cửa sổ nhận tin dội lại',
      note: 'Tin của chính tài khoản trùng một câu bot vừa gửi, xuất hiện trong khoảng này, được coi là tin dội lại của bot. Người gõ cùng nội dung sau khoảng này thì không bị coi là dội lại.'
    },
    en: {
      label: 'Echo detection window',
      note: "A message from the account itself that matches a sentence the bot just sent, appearing within this time, counts as the bot's echo. The same text typed by a person after this window is not treated as an echo."
    }
  },
  'chat.restorePreviousConversation': {
    vi: {
      label: 'Quay về nhóm đang mở trước đó',
      note: 'Sau khi trả lời, true là mở lại cuộc trò chuyện Zalo đang hiện trước đó, false (mặc định) là ở lại nhóm vừa trả lời. Dùng true khi có người đang xem Zalo Desktop này.'
    },
    en: {
      label: 'Return to the previous chat',
      note: 'After replying, true reopens the conversation Zalo was showing before, false (default) stays in the group just answered. Use true when someone is looking at this Zalo Desktop.'
    }
  },
  'sessions.chieuFromHour': {
    vi: {
      label: 'Buổi chiều bắt đầu lúc',
      note: 'Giờ bắt đầu buổi chiều (0 đến 23); buổi sáng là từ 00:00 đến giờ này. Phải lớn hơn 0 và nhỏ hơn giờ bắt đầu buổi tối.'
    },
    en: {
      label: 'Afternoon starts at',
      note: 'Hour the afternoon starts (0 to 23); morning runs from 00:00 up to this hour. Must be above 0 and below the evening start hour.'
    }
  },
  'sessions.toiFromHour': {
    vi: {
      label: 'Buổi tối bắt đầu lúc',
      note: 'Giờ bắt đầu buổi tối: chiều kéo dài đến trước giờ này, tối kéo đến hết ngày (tối đa 23). Chỉ ảnh hưởng dữ liệu mới, báo cáo đã dựng không tự dựng lại.'
    },
    en: {
      label: 'Evening starts at',
      note: 'Hour the evening starts: afternoon runs up to this hour, evening to the end of the day (23 at most). Affects new data only; reports already built are not rebuilt.'
    }
  },
  'phases.morningEndFromHour': {
    vi: {
      label: 'Cuối buổi sáng từ',
      note: "Giờ bắt đầu giai đoạn 'cuối buổi sáng' (giờ lẻ được, 9.5 là 9:30). Báo cáo gửi trước giờ này thuộc 'đầu buổi sáng'. Các mốc phải tăng dần: cuối sáng, đầu chiều, cuối chiều, đầu sáng hôm sau."
    },
    en: {
      label: 'End of morning from',
      note: "Hour the 'end of morning' phase starts (fractions allowed, 9.5 is 9:30). Reports sent before it belong to 'start of morning'. The four times must increase in order: end of morning, start of afternoon, end of afternoon, next morning's start."
    }
  },
  'phases.afternoonStartFromHour': {
    vi: {
      label: 'Đầu buổi chiều từ',
      note: "Giờ bắt đầu giai đoạn 'đầu buổi chiều' (giờ lẻ được, 12.5 là 12:30). Phải lớn hơn mốc cuối buổi sáng và nhỏ hơn mốc cuối buổi chiều."
    },
    en: {
      label: 'Start of afternoon from',
      note: "Hour the 'start of afternoon' phase begins (fractions allowed, 12.5 is 12:30). Must be after the end-of-morning time and before the end-of-afternoon time."
    }
  },
  'phases.afternoonEndFromHour': {
    vi: {
      label: 'Cuối buổi chiều từ',
      note: "Giờ bắt đầu giai đoạn 'cuối buổi chiều' (giờ lẻ được, 15 là 15:00). Phải lớn hơn mốc đầu buổi chiều và nhỏ hơn mốc đầu buổi sáng hôm sau."
    },
    en: {
      label: 'End of afternoon from',
      note: "Hour the 'end of afternoon' phase begins (fractions allowed, 15 is 15:00). Must be after the start-of-afternoon time and before next morning's start time."
    }
  },
  'phases.morningStartFromHour': {
    vi: {
      label: 'Đầu buổi sáng hôm sau từ',
      note: "Giờ bắt đầu giai đoạn 'đầu buổi sáng NGÀY MAI' (17.5 là 17:30). Báo cáo gửi từ giờ này đến hết đêm được tính cho ngày hôm sau. Phải lớn hơn mọi mốc còn lại."
    },
    en: {
      label: "Next morning's start from",
      note: "Hour the 'start of TOMORROW's morning' phase begins (17.5 is 17:30). Reports sent from this hour through the night count for the next day. Must be later than all the other times."
    }
  },
  'total.windowStartHour': {
    vi: {
      label: 'Bắt đầu khung dữ liệu',
      note: 'Giờ bắt đầu khung tin của mọi đợt báo cáo tổng (giờ lẻ được, 6.5 là 6:30). Tin gửi trước giờ này không được tính.'
    },
    en: {
      label: 'Data window starts at',
      note: 'Hour the message window starts for every total-report round (fractions allowed, 6.5 is 6:30). Messages sent before it are not counted.'
    }
  },
  'total.morningHour': {
    vi: {
      label: 'Giờ xuất đợt sáng',
      note: 'Giờ bot:total xuất đợt sáng, cũng là cuối khung tin: lấy tin từ giờ bắt đầu khung đến trước giờ này.'
    },
    en: {
      label: 'Morning report time',
      note: 'Time bot:total writes the morning round, which is also the end of its window: messages from the window start up to this time are used.'
    }
  },
  'total.afternoonHour': {
    vi: {
      label: 'Giờ xuất đợt chiều',
      note: 'Giờ bot:total xuất đợt chiều: lấy tin từ giờ bắt đầu khung đến trước giờ này (cộng dồn cả buổi sáng). Phải lớn hơn giờ xuất đợt sáng và không quá 24.'
    },
    en: {
      label: 'Afternoon report time',
      note: 'Time bot:total writes the afternoon round: messages from the window start up to this time (the morning included). Must be later than the morning time and at most 24.'
    }
  },
  'total.waitMaxMinutes': {
    vi: {
      label: 'Chờ runner rảnh tối đa',
      note: 'Tới giờ đợt mà bot:runner còn bận (hàng chờ chưa rỗng), bot:total đợi tối đa ngần này phút rồi vẫn xuất bằng dữ liệu có sẵn, kèm cảnh báo.'
    },
    en: {
      label: 'Longest wait for the runner',
      note: 'If bot:runner is still busy (queue not empty) at report time, bot:total waits up to this many minutes, then writes the report with the data it has, with a warning.'
    }
  },
  'total.refreshEveryMinutes': {
    vi: {
      label: 'Xuất lại mỗi',
      note: 'Nếu lần xuất đầu thiếu dữ liệu vì bot:runner bận, bot:total xuất lại mỗi ngần này phút (hoặc ngay khi hàng chờ rỗng).'
    },
    en: {
      label: 'Rewrite every',
      note: 'If the first write lacked data because bot:runner was busy, bot:total writes again every this many minutes (or as soon as the queue is empty).'
    }
  },
  'total.refreshUntilMinutes': {
    vi: {
      label: 'Ngừng xuất lại sau',
      note: 'Ngừng xuất lại sau ngần này phút kể từ giờ đợt.'
    },
    en: {
      label: 'Stop rewriting after',
      note: "Stops rewriting the report this many minutes after the round's time."
    }
  },
  'total.pollSeconds': {
    vi: {
      label: 'Chu kỳ kiểm giờ đợt',
      note: 'Bao lâu bot:total nhìn lại đồng hồ xem đã tới giờ xuất đợt chưa.'
    },
    en: {
      label: 'Schedule check interval',
      note: 'How often bot:total checks the clock to see whether it is time for a round.'
    }
  },
  'print.enabled': {
    vi: {
      label: 'In tự động',
      note: 'Bật thì bot:total tự in các file báo cáo tổng ra máy in mặc định của Windows (1 bản), chỉ ở lần xuất đầu của mỗi đợt. Mặc định tắt cho tới khi máy in được kiểm chứng. Đổi xong khởi động lại bot:total.'
    },
    en: {
      label: 'Automatic printing',
      note: 'When on, bot:total prints the total-report files on the Windows default printer (1 copy), only at the first write of each round. Off by default until the printer is verified. Restart bot:total after changing.'
    }
  },
  'print.centerPage': {
    vi: {
      label: 'Căn giữa trang khi in',
      note: 'Khi in, căn nội dung giữa trang theo chiều ngang, lề trái bằng lề phải (lấy lề lớn hơn nên bảng không bị cắt). Chỉ đổi bản in, không sửa file xuất. Tắt thì in đúng lề của file mẫu.'
    },
    en: {
      label: 'Center page when printing',
      note: "When printing, centers the content horizontally with equal left and right margins (the larger one, so the table is not cut). Changes the printout only, not the exported file. Off prints with the template's own margins."
    }
  },
  'print.sets': {
    vi: {
      label: 'Chỉ in các bộ này',
      note: 'Chỉ in file của các bộ báo cáo có id trong danh sách này (id như trong reportSets); để trống là in mọi bộ. Lệnh tay total:once --print không bị giới hạn.'
    },
    en: {
      label: 'Print only these sets',
      note: 'Prints only the files of the report sets whose id is listed (ids as in reportSets); empty means all sets. The manual command total:once --print is not limited by this.'
    }
  },
  'print.maxPagesPerFile': {
    vi: {
      label: 'Số trang in tối đa mỗi file',
      note: 'Mỗi file chỉ in tối đa ngần này trang đầu; nhiều hơn thì cắt bớt và ghi cảnh báo, để một lần chạy không in cả chục tờ.'
    },
    en: {
      label: 'Max printed pages per file',
      note: 'Each file prints at most this many pages from the start; more than that is cut off with a warning, so one run never prints a dozen sheets.'
    }
  },
  'techReports.attendanceStartUntil': {
    vi: {
      label: 'Điểm danh đầu buổi: lấy tin đến hết giờ',
      note: 'Chỉ lấy tin ĐIỂM DANH ĐẦU BUỔI gửi trong ngày đến hết giờ này (dạng HH:MM, phút mốc còn lấy). Tin gửi sau đó bị bỏ.'
    },
    en: {
      label: 'Roll call, start of session: take messages until',
      note: 'Only ĐIỂM DANH ĐẦU BUỔI messages sent today up to this time are used (HH:MM, the minute itself is included). Later messages are ignored.'
    }
  },
  'techReports.attendanceEndUntil': {
    vi: {
      label: 'Điểm danh cuối buổi: lấy tin đến hết giờ',
      note: 'Chỉ lấy tin ĐIỂM DANH CUỐI BUỔI gửi trong ngày đến hết giờ này (dạng HH:MM). Tin gửi sau đó bị bỏ.'
    },
    en: {
      label: 'Roll call, end of session: take messages until',
      note: 'Only ĐIỂM DANH CUỐI BUỔI messages sent today up to this time are used (HH:MM). Later messages are ignored.'
    }
  },
  'techReports.shiftStartUntil': {
    vi: {
      label: 'Công việc đầu ca: lấy tin đến hết giờ',
      note: 'Chỉ lấy tin CÔNG VIỆC ĐẦU CA LÀM gửi trong ngày đến hết giờ này (dạng HH:MM). Tin gửi sau đó bị bỏ.'
    },
    en: {
      label: 'Start-of-shift work: take messages until',
      note: 'Only CÔNG VIỆC ĐẦU CA LÀM messages sent today up to this time are used (HH:MM). Later messages are ignored.'
    }
  },
  'techReports.shiftEndUntil': {
    vi: {
      label: 'Công việc cuối ca: lấy tin đến hết giờ',
      note: 'Chỉ lấy tin CÔNG VIỆC CUỐI CA LÀM gửi trong ngày đến hết giờ này (dạng HH:MM). Tin gửi sau đó bị bỏ.'
    },
    en: {
      label: 'End-of-shift work: take messages until',
      note: 'Only CÔNG VIỆC CUỐI CA LÀM messages sent today up to this time are used (HH:MM). Later messages are ignored.'
    }
  },
  'vision.enabled': {
    vi: {
      label: 'Đọc ảnh tự động',
      note: 'Bật thì bot:runner tự đọc ảnh nghỉ phép trong mỗi chu trình (gọi agent, tốn hạn mức). Tắt thì không gọi agent; các lệnh photos:* chạy tay vẫn chạy được.'
    },
    en: {
      label: 'Automatic photo reading',
      note: 'When on, bot:runner reads leave photos by itself in every cycle (calls an agent, uses your quota). Off means no agent is called; the manual photos:* commands still work.'
    }
  },
  'vision.reader': {
    vi: {
      label: 'Cách đọc ảnh',
      note: 'Dịch vụ dùng để đọc ảnh; hiện chỉ có openrouter (gọi API OpenRouter). Khóa API đặt trong file .env hoặc biến môi trường OPENROUTER_API_KEY, không ghi vào config.ts.'
    },
    en: {
      label: 'Photo reading service',
      note: 'The service used to read photos; only openrouter exists for now (calls the OpenRouter API). Put the API key in the .env file or the OPENROUTER_API_KEY environment variable, not in config.ts.'
    }
  },
  'vision.model': {
    vi: {
      label: 'Model đọc lần 1',
      note: 'Tên model OpenRouter dùng cho lần đọc ảnh thứ nhất; model phải đọc được ảnh.'
    },
    en: {
      label: 'Model for 1st reading',
      note: 'OpenRouter model name used for the first reading of a photo; the model must be able to read images.'
    }
  },
  'vision.secondModel': {
    vi: {
      label: 'Model đọc lần 2',
      note: 'Model OpenRouter cho lần đọc thứ hai, độc lập với lần một. Nên chọn model khác lần một để hai lần đọc ít sai giống nhau.'
    },
    en: {
      label: 'Model for 2nd reading',
      note: 'OpenRouter model for the second, independent reading. Pick a different model from the first so the two readings are less likely to make the same mistake.'
    }
  },
  'vision.timeoutSeconds': {
    vi: {
      label: 'Hết giờ mỗi lần đọc',
      note: 'Chờ tối đa ngần này giây cho một lần gọi model đọc một bộ ảnh; quá hạn thì bộ đó báo lỗi và chưa được đọc.'
    },
    en: {
      label: 'Timeout per reading',
      note: 'Waits at most this many seconds for one model call that reads one photo bundle; after that the bundle is reported as an error and stays unread.'
    }
  },
  'vision.prefilter.enabled': {
    vi: {
      label: 'Lọc ảnh bằng OCR',
      note: 'OCR (nhận dạng chữ) chạy ngay trên máy để xếp từng ảnh vào loại (nghỉ phép, tốc độ, biên bản) và chỉ gửi ảnh cần thiết cho agent. Tắt thì gửi cả bộ ảnh. Cần mạng một lần để tải dữ liệu tiếng Việt.'
    },
    en: {
      label: 'Pre-sort photos with OCR',
      note: 'OCR (text recognition) runs on this computer to sort each photo into a type (leave, speed, minutes) and sends only the needed photos to the agent. Off sends the whole bundle. Needs internet once to download Vietnamese data.'
    }
  },
  'vision.prefilter.minImages': {
    vi: {
      label: 'Số ảnh tối thiểu để OCR',
      note: 'Bộ ảnh có ít hơn số này thì bỏ qua OCR và gửi thẳng cho agent, vì lọc không tiết kiệm được gì. Riêng bộ kèm tin điểm danh hoặc công việc đầu ca luôn được OCR.'
    },
    en: {
      label: 'Min photos to use OCR',
      note: 'A bundle with fewer photos than this skips OCR and goes straight to the agent, since sorting would save nothing. The exception is a bundle with a roll-call or start-of-shift message attached: it always goes through OCR.'
    }
  },
  'vision.prefilter.concurrency': {
    vi: {
      label: 'Số luồng OCR song song',
      note: 'Số luồng OCR chạy cùng lúc; mỗi luồng tốn khoảng 100 đến 200 MB bộ nhớ.'
    },
    en: {
      label: 'Parallel OCR workers',
      note: 'How many OCR workers run at the same time; each uses about 100 to 200 MB of memory.'
    }
  },
  'vision.leave.dateFormat': {
    vi: {
      label: 'Thứ tự ngày trên bảng nghỉ phép',
      note: 'MDY là tháng/ngày/năm (10/05/2026 là 5 tháng 10), DMY là ngày/tháng/năm. Chọn đúng kiểu in trên bảng; agent chép nguyên văn ngày, chương trình tự đổi theo lựa chọn này.'
    },
    en: {
      label: 'Date order on leave sheets',
      note: 'MDY is month/day/year (10/05/2026 is 5 October), DMY is day/month/year. Choose the style printed on the sheet; the agent copies the date as printed and the program converts it using this choice.'
    }
  },
  'vision.maxBundlesPerRun': {
    vi: {
      label: 'Số bộ ảnh tối đa mỗi lần',
      note: 'Mỗi lần chạy (photos:read hoặc một chu trình bot:runner) gọi agent đọc tối đa ngần này bộ ảnh, để không tốn hạn mức quá mức. Bộ bị bỏ vì kèm tin điểm danh hoặc đầu ca không tính.'
    },
    en: {
      label: 'Max photo bundles per run',
      note: 'Each run (photos:read or one bot:runner cycle) calls the agent on at most this many photo bundles, to keep quota use under control. Bundles skipped because of an attached roll-call or start-of-shift message do not count.'
    }
  },
  'vision.bundle.gapMinutes': {
    vi: {
      label: 'Khoảng cách ảnh cùng bộ',
      note: 'Hai ảnh liên tiếp của cùng một người cách nhau không quá ngần này phút thì được gom vào cùng một bộ ảnh (bundle).'
    },
    en: {
      label: 'Max gap within a photo bundle',
      note: 'Two consecutive photos from the same person no more than this many minutes apart are grouped into the same bundle.'
    }
  },
  'vision.bundle.textWindowMinutes': {
    vi: {
      label: 'Cửa sổ tin chữ đi kèm',
      note: 'Tin chữ của cùng người gửi trong khoảng ngần này phút quanh bộ ảnh được đính kèm làm tiêu đề hoặc chú thích.'
    },
    en: {
      label: 'Attached-text window',
      note: 'Text messages from the same sender within this many minutes around a bundle are attached to it as its title or caption.'
    }
  },
  'vision.leave.groups': {
    vi: {
      label: 'Nhóm đọc ảnh (nghỉ phép và biên bản)',
      note: 'Tên các nhóm (đúng như trong danh sách theo dõi) mà ảnh nghỉ phép và ảnh biên bản được đọc. Ảnh ở nhóm khác không bao giờ bị đưa cho agent; nhóm nào cần đọc biên bản cũng phải có ở đây.'
    },
    en: {
      label: 'Groups for photos (leave and minutes)',
      note: 'Names of the groups (exactly as on the watch list) whose leave and meeting-minutes photos are read. Photos in other groups are never given to the agent; a group that needs its minutes read must be listed here.'
    }
  },
  'vision.leave.senders': {
    vi: {
      label: 'Người gửi ảnh nghỉ phép',
      note: 'Chỉ đọc ảnh của những người gửi này (tên hiển thị trong Zalo); để trống là đọc ảnh của mọi người trong các nhóm nghỉ phép.'
    },
    en: {
      label: 'Leave-photo senders',
      note: 'Only photos from these senders (display names in Zalo) are read; empty means everyone in the leave groups.'
    }
  },
  'vision.leave.settleSeconds': {
    vi: {
      label: 'Đóng bộ ảnh sau',
      note: 'Bộ ảnh nghỉ phép được coi là đủ ảnh sau khi yên ngần này giây kể từ ảnh cuối. Phải nhỏ hơn thời gian chờ yên của bot:runner (runner.quietSeconds), nếu không bộ chưa đóng khi chu trình chạy.'
    },
    en: {
      label: 'Close a bundle after',
      note: "A leave bundle counts as complete after this many quiet seconds since its last photo. Must be smaller than bot:runner's quiet time (runner.quietSeconds), or the bundle is still open when the cycle runs."
    }
  },
  'vision.leave.lookbackDays': {
    vi: {
      label: 'Tìm ảnh nghỉ phép trong',
      note: 'Khi dựng file, chỉ tìm ảnh nghỉ phép trong ngần này ngày gần nhất; kỳ nghỉ của ảnh cũ hơn bị bỏ qua.'
    },
    en: {
      label: 'Look for leave photos within',
      note: 'When building the file, only leave photos from the last this-many days are searched; leave periods from older photos are ignored.'
    }
  },
  'vision.leave.maxPastDays': {
    vi: {
      label: 'Nghỉ sớm nhất so với ngày gửi',
      note: 'Ngày bắt đầu nghỉ ghi trên ảnh không được sớm hơn ngày gửi ảnh quá ngần này ngày; nếu quá thì dòng đó chờ người xem lại (thường do đọc sai năm).'
    },
    en: {
      label: 'Earliest leave start vs. sent date',
      note: 'The leave start date on the photo may not be earlier than the day it was sent by more than this many days; otherwise the row waits for review (often a misread year).'
    }
  },
  'vision.leave.maxFutureDays': {
    vi: {
      label: 'Nghỉ xa nhất so với ngày gửi',
      note: 'Ngày bắt đầu nghỉ ghi trên ảnh không được muộn hơn ngày gửi ảnh quá ngần này ngày; nếu quá thì dòng đó chờ người xem lại.'
    },
    en: {
      label: 'Furthest leave start vs. sent date',
      note: 'The leave start date on the photo may not be later than the day it was sent by more than this many days; otherwise the row waits for review.'
    }
  }
}
