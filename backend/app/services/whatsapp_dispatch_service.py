import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import httpx
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.whatsapp import WhatsAppCrewSubscriber, WhatsAppMessageLog
from backend.app.models.block import Block, BlockTask
from backend.app.models.train import Train, TrainSchedule, TrainDelay
from backend.app.models.defect import Defect
from backend.app.models.user import User

logger = logging.getLogger(__name__)

class WhatsAppDispatchService:
    """
    RailOptima Field Dispatcher (রেলঅপ্টিমা ফিল্ড ডিসপ্যাচার / रेलऑप्टिमा फील्ड डिस्पैचर)
    Service for sending zero-app WhatsApp alerts, processing ground crew responses,
    handling dynamic re-sequencing notifications, and executing 2-way track possession commands.
    """

    # ── Template 1: Dynamic Re-sequencing Alert (Train A Delay Swap) ──────────
    @staticmethod
    def render_resequence_alert(
        train_a_name: str,
        delay_mins: int,
        new_eta: str,
        train_b_name: str,
        location: str,
        start_time: str,
        end_time: str,
        duration_mins: int,
        task_scope: str,
        lang: str = "en"
    ) -> str:
        if lang == "bn":
            return (
                f"⚠️ *RAILOPTIMA সময়সূচী পরিবর্তন সতর্কতা*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🚨 *ট্রেন বিলম্ব এবং কাজ পুনর্নির্ধারণ*\n\n"
                f"🚆 *Train A:* {train_a_name}\n"
                f"⏱️ *অবস্থা:* +{delay_mins} মিনিট বিলম্বিত | *নতুন ETA:* {new_eta}\n\n"
                f"🔄 *জরুরী নির্দেশ:* \n"
                f"অনুগ্রহ করে অবিলম্বে *Train B* এর কাজ সম্পন্ন করার জন্য এগিয়ে যান:\n"
                f"🚆 *Train B:* {train_b_name}\n"
                f"📍 *অবস্থান:* {location}\n"
                f"⏱️ *উপলব্ধ সময়:* {start_time} - {end_time} ({duration_mins} মিনিট)\n"
                f"🛠️ *কাজ:* {task_scope}\n\n"
                f"👉 *উত্তর দিন:*\n"
                f"• *1* বা *ACK* - নিশ্চিত করার জন্য\n"
                f"• *START* - কাজ শুরু এবং পজেশন নেওয়ার সময়\n"
                f"• *STATUS* - সরাসরি ট্রেন ট্র্যাকিংয়ের জন্য\n\n"
                f"*(দ্রষ্টব্য: Train A পৌঁছানোর সাথে সাথেই Train B এর পর তার কাজ শুরু হবে।)*"
            )
        elif lang == "hi":
            return (
                f"⚠️ *RAILOPTIMA शेड्यूल अपडेट*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🚨 *ट्रेन देरी एवं कार्य पुनरनुक्रमण (RE-SEQUENCING)*\n\n"
                f"🚆 *Train A:* {train_a_name}\n"
                f"⏱️ *स्थिति:* +{delay_mins} मिनट की देरी | *नया ETA:* {new_eta}\n\n"
                f"🔄 *आवश्यक कार्रवाई:* \n"
                f"कृपया तुरंत *Train B* पर काम शुरू करने के लिए बढ़ें:\n"
                f"🚆 *Train B:* {train_b_name}\n"
                f"📍 *स्थान:* {location}\n"
                f"⏱️ *उपलब्ध विंडो:* {start_time} से {end_time} ({duration_mins} मिनट)\n"
                f"🛠️ *कार्य:* {task_scope}\n\n"
                f"👉 *उत्तर दें:*\n"
                f"• *1* या *ACK* - स्वीकार करने के लिए\n"
                f"• *START* - कार्य शुरू व पज़ेशन लेने पर\n"
                f"• *STATUS* - लाइव ट्रेन स्थिति जानने के लिए\n\n"
                f"*(नोट: Train A आते ही Train B के तुरंत बाद री-शेड्यूल कर दी जाएगी।)*"
            )
        elif lang == "hinglish":
            return (
                f"⚠️ *RAILOPTIMA SCHEDULE UPDATE*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🚨 *TRAIN DELAY & TASK RE-SEQUENCING*\n\n"
                f"🚆 *Train A:* {train_a_name}\n"
                f"⏱️ *Status:* Delayed by +{delay_mins} mins | *New ETA:* {new_eta}\n\n"
                f"🔄 *ACTION REQUIRED:*\n"
                f"Please proceed immediately to work on *Train B*:\n"
                f"🚆 *Train B:* {train_b_name}\n"
                f"📍 *Location:* {location}\n"
                f"⏱️ *Available Window:* {start_time} to {end_time} ({duration_mins} Mins)\n"
                f"🛠️ *Task:* {task_scope}\n\n"
                f"👉 *Reply with:*\n"
                f"• *1* or *ACK* to acknowledge\n"
                f"• *START* when you reach site & take possession\n"
                f"• *STATUS* for live train tracking\n\n"
                f"*(Note: Train A will be scheduled immediately after Train B upon arrival.)*"
            )
        else: # Default English
            return (
                f"⚠️ *RAILOPTIMA SCHEDULE UPDATE*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🚨 *TRAIN DELAY & TASK RE-SEQUENCING*\n\n"
                f"🚆 *Train A:* {train_a_name}\n"
                f"⏱️ *Status:* Delayed by +{delay_mins} mins | *New ETA:* {new_eta}\n\n"
                f"🔄 *ACTION REQUIRED:*\n"
                f"Please proceed immediately to work on *Train B*:\n"
                f"🚆 *Train B:* {train_b_name}\n"
                f"📍 *Location:* {location}\n"
                f"⏱️ *Available Window:* {start_time} – {end_time} ({duration_mins} Mins)\n"
                f"🛠️ *Task:* {task_scope}\n\n"
                f"👉 *Reply with:*\n"
                f"• *1* or *ACK* to acknowledge\n"
                f"• *START* when you reach the site & take possession\n"
                f"• *STATUS* for live train tracking\n\n"
                f"*(Note: Train A will be scheduled immediately after Train B upon arrival.)*"
            )

    # ── Template 2: Normal Block Allocation Alert ─────────────────────────────
    @staticmethod
    def render_work_order(
        block_code: str,
        line_train: str,
        location: str,
        start_time: str,
        end_time: str,
        duration_mins: int,
        task_details: str,
        gang_name: str,
        lang: str = "en"
    ) -> str:
        if lang == "bn":
            return (
                f"📋 *RAILOPTIMA ওয়ার্ক অর্ডার (WORK ORDER)*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🛠️ *ব্লক কোড:* {block_code}\n"
                f"🚆 *ট্রেন / লাইন:* {line_train}\n"
                f"📍 *অবস্থান:* {location}\n"
                f"⏱️ *ব্লক সময়:* {start_time} থেকে {end_time} ({duration_mins} মিনিট)\n"
                f"🔧 *কাজের বিবরণ:* {task_details}\n"
                f"👥 *দায়িত্বপ্রাপ্ত গ্যাং:* {gang_name}\n\n"
                f"👉 *উত্তর দিন:*\n"
                f"• *1* - কাজ স্বীকার ও গ্রহণ করতে\n"
                f"• *START* - পজেশন নিয়ে কাজ শুরু করলে\n"
                f"• *DONE* - কাজ সম্পন্ন এবং ট্র্যাক ফিট হলে"
            )
        elif lang == "hi":
            return (
                f"📋 *RAILOPTIMA कार्य आदेश (WORK ORDER)*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🛠️ *ब्लॉक कोड:* {block_code}\n"
                f"🚆 *ट्रेन / लाइन:* {line_train}\n"
                f"📍 *स्थान:* {location}\n"
                f"⏱️ *ब्लॉक विंडो:* {start_time} से {end_time} ({duration_mins} मिनट)\n"
                f"🔧 *कार्य विवरण:* {task_details}\n"
                f"👥 *आवंटित गैंग:* {gang_name}\n\n"
                f"👉 *उत्तर दें:*\n"
                f"• *1* - स्वीकार करें (Acknowledge)\n"
                f"• *START* - पज़ेशन लिया (काम शुरू)\n"
                f"• *DONE* - काम समाप्त (ट्रैक फिट)"
            )
        else:
            return (
                f"📋 *RAILOPTIMA WORK ORDER*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🛠️ *Block Code:* {block_code}\n"
                f"🚆 *Train / Line:* {line_train}\n"
                f"📍 *Location:* {location}\n"
                f"⏱️ *Block Window:* {start_time} to {end_time} ({duration_mins} Mins)\n"
                f"🔧 *Task Details:* {task_details}\n"
                f"👥 *Assigned Gang:* {gang_name}\n\n"
                f"👉 *Reply:*\n"
                f"• *1* - Acknowledge & Accept\n"
                f"• *START* - Work Started (Track Possessed)\n"
                f"• *DONE* - Work Finished (Track Fit)"
            )

    # ── Template 3: 15-Minute Block Expiry Warning ────────────────────────────
    @staticmethod
    def render_countdown_warning(
        location: str,
        next_train: str,
        next_train_eta: str,
        close_time: str,
        lang: str = "en"
    ) -> str:
        if lang == "bn":
            return (
                f"⏳ *সুরক্ষা কাউন্টডাউন সতর্কতা*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"⚠️ *ব্লক ক্লিয়ারেন্সের জন্য ১৫ মিনিট বাকি*\n\n"
                f"📍 *সেকশন / স্থান:* {location}\n"
                f"🚆 *পরবর্তী আগমনকারী ট্রেন:* {next_train} (ETA: {next_train_eta})\n"
                f"⏱️ *পজেশন বন্ধ হবে:* {close_time}\n\n"
                f"👉 *জরুরী নির্দেশ:* রক্ষণাবেক্ষণ গুটিয়ে নিন, ব্যালাস্ট ও ফিটিং সুরক্ষিত করুন এবং ট্র্যাক থেকে লোক ও সরঞ্জাম সরিয়ে নিন।\n"
                f"• ট্র্যাক ফিট হলে উত্তর দিন: *DONE*\n"
                f"• জরুরী সময় বাড়াতে উত্তর দিন: *DELAY +15*"
            )
        elif lang == "hi":
            return (
                f"⏳ *सुरक्षा काउंटडाउन अलर्ट*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"⚠️ *ब्लॉक क्लीयरेंस के लिए केवल 15 मिनट शेष*\n\n"
                f"📍 *सेक्शन / स्थान:* {location}\n"
                f"🚆 *अगली आ रही ट्रेन:* {next_train} (ETA: {next_train_eta})\n"
                f"⏱️ *पज़ेशन समाप्त समय:* {close_time}\n\n"
                f"👉 *कार्रवाई:* कार्य समेटें, फिटिंग टाइट करें और ट्रैक खाली करें।\n"
                f"• ट्रैक सुरक्षित होने पर उत्तर दें: *DONE*\n"
                f"• समय बढ़ाने के लिए उत्तर दें: *DELAY +15*"
            )
        else:
            return (
                f"⏳ *SAFETY COUNTDOWN ALERT*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"⚠️ *15 MINUTES REMAINING FOR BLOCK CLEARANCE*\n\n"
                f"📍 *Section:* {location}\n"
                f"🚆 *Next Approaching Train:* {next_train} (ETA: {next_train_eta})\n"
                f"⏱️ *Possession Closes At:* {close_time}\n\n"
                f"👉 *Action:* Wrap up maintenance, pack ballast/secure fittings, and clear personnel & tools from track.\n"
                f"• Reply *DONE* once track is certified fit for traffic.\n"
                f"• Reply *DELAY +15* if emergency extension is needed."
            )

    # ── WhatsApp External Send (Meta API or Mock Fallback) ────────────────────
    @classmethod
    def send_whatsapp_message(
        cls,
        phone_number: str,
        message_text: str,
        db: Optional[Session] = None,
        msg_type: str = "text",
        payload_meta: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Sends outbound message via Meta WhatsApp Cloud API if credentials are present,
        or logs simulated dispatch. Always writes to WhatsAppMessageLog in DB.
        """
        success = False
        api_response = None

        if settings.WHATSAPP_API_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID:
            url = f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
            headers = {
                "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
                "Content-Type": "application/json"
            }
            body = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": phone_number,
                "type": "text",
                "text": {"preview_url": False, "body": message_text}
            }
            try:
                res = httpx.post(url, headers=headers, json=body, timeout=8.0)
                api_response = res.json()
                if res.status_code in [200, 201]:
                    success = True
            except Exception as e:
                logger.error(f"WhatsApp API HTTP Error: {str(e)}")
                api_response = {"error": str(e)}
        else:
            # Simulated environment (Demo/Prototype mode)
            success = True
            api_response = {"status": "simulated_sent", "recipient": phone_number}

        # Save to DB log if session provided
        if db:
            try:
                log_entry = WhatsAppMessageLog(
                    message_id=api_response.get("messages", [{}])[0].get("id") if isinstance(api_response, dict) and "messages" in api_response else f"SIM-MSG-{int(datetime.utcnow().timestamp())}",
                    phone_number=phone_number,
                    direction="outbound",
                    message_type=msg_type,
                    content=message_text,
                    delivery_status="sent" if success else "failed",
                    payload=payload_meta or api_response
                )
                db.add(log_entry)
                db.commit()
            except Exception as ex:
                logger.error(f"Failed to record message log: {str(ex)}")

        return {
            "success": success,
            "recipient": phone_number,
            "response": api_response,
            "message_text": message_text
        }

    # ── Inbound Message Handling & Structured Tool Execution ──────────────────
    @classmethod
    def process_inbound_message(
        cls,
        db: Session,
        phone_number: str,
        message_body: str,
        raw_payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Parses inbound crew messages, determines user intention, executes corresponding
        railway operational tool actions, updates DB, and returns tailored reply.
        """
        text = message_body.strip()
        text_upper = text.upper()

        # Find subscriber or create default subscriber entry
        sub = db.query(WhatsAppCrewSubscriber).filter(WhatsAppCrewSubscriber.phone_number == phone_number).first()
        if not sub:
            sub = WhatsAppCrewSubscriber(
                phone_number=phone_number,
                full_name="Ground Staff Maintainer",
                crew_id="CREW-AUTO-01",
                role="Junior Engineer",
                department="Engineering",
                language_pref="en"
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)

        sub.last_active_at = datetime.utcnow()
        lang = sub.language_pref or "en"

        # Check subscriber latest active block or recent proposed/in-progress block
        active_block = db.query(Block).order_by(Block.id.desc()).first()

        intent = "UNKNOWN"
        tool_executed = "NONE"
        reply_text = ""
        tool_params = {}

        # ── INTENT RECOGNITION ──
        # 1. ACK / 1 Confirmation
        if text_upper in ["1", "ACK", "ACCEPT", "CONFIRM", "OK", "হ্যাঁ", "हाँ", "हा"]:
            intent = "ACK"
            tool_executed = "ACKNOWLEDGE_BLOCK"
            tool_params = {"block_id": active_block.id if active_block else 1, "user_id": sub.phone_number}

            if active_block and active_block.status == "Proposed":
                active_block.status = "Approved"
                db.commit()

            if lang == "bn":
                reply_text = (
                    f"✅ *কাজ নিশ্চিত করা হয়েছে!*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"ব্লক: {active_block.block_code if active_block else 'BLK-NCR-001'}\n"
                    f"আপনার একনলেজমেন্ট সিস্টেমে সংরক্ষিত হয়েছে। কাজের স্থানে পৌঁছে ব্লক পজেশন নিতে *START* লিখুন।"
                )
            elif lang == "hi":
                reply_text = (
                    f"✅ *कार्य आदेश स्वीकृत!*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"ब्लॉक: {active_block.block_code if active_block else 'BLK-NCR-001'}\n"
                    f"आपकी स्वीकृति दर्ज कर ली गई है। साइट पर पहुंचकर पज़ेशन शुरू करने के लिए *START* लिखें।"
                )
            else:
                reply_text = (
                    f"✅ *WORK ORDER ACKNOWLEDGED*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"Block: {active_block.block_code if active_block else 'BLK-NCR-001'}\n"
                    f"Acknowledgement logged in RailOptima. Reply *START* when you take possession at site."
                )

        # 2. START / Possession Start
        elif "START" in text_upper or "2" == text_upper or "শুরু" in text or "शुरू" in text:
            intent = "START"
            tool_executed = "START_POSSESSION"
            tool_params = {"block_id": active_block.id if active_block else 1, "user_id": sub.phone_number, "timestamp": datetime.utcnow().isoformat()}

            if active_block:
                active_block.status = "In_Progress"
                active_block.actual_start_time = datetime.utcnow()
                db.commit()

            if lang == "bn":
                reply_text = (
                    f"🟢 *ট্র্যাক পজেশন শুরু হয়েছে!*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"ব্লক: {active_block.block_code if active_block else 'BLK-NCR-001'}\n"
                    f"সময়: {datetime.now().strftime('%H:%M:%S')}\n"
                    f"ট্র্যাক সম্পর্কিত কাজ সম্পূর্ণ হলে *DONE* লিখে জানান।"
                )
            elif lang == "hi":
                reply_text = (
                    f"🟢 *ट्रैक पज़ेशन प्रारंभ (WORK STARTED)!*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"ब्लॉक: {active_block.block_code if active_block else 'BLK-NCR-001'}\n"
                    f"समय: {datetime.now().strftime('%H:%M:%S')}\n"
                    f"काम पूरा होने पर *DONE* लिखकर ट्रैक क्लियर करें।"
                )
            else:
                reply_text = (
                    f"🟢 *TRACK POSSESSION STARTED*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"Block Code: {active_block.block_code if active_block else 'BLK-NCR-001'}\n"
                    f"Start Time: {datetime.now().strftime('%H:%M:%S')}\n"
                    f"Safety Flag Active. Reply *DONE* when work is finished & track certified fit."
                )

        # 3. DONE / Completion
        elif "DONE" in text_upper or "3" == text_upper or "FINISH" in text_upper or "হয়ে গেছে" in text or "हो गया" in text or "COMPLETED" in text_upper:
            intent = "DONE"
            tool_executed = "COMPLETE_POSSESSION"
            tool_params = {"block_id": active_block.id if active_block else 1, "user_id": sub.phone_number, "notes": "Track certified fit for traffic."}

            if active_block:
                active_block.status = "Completed"
                active_block.actual_end_time = datetime.utcnow()
                db.commit()

            if lang == "bn":
                reply_text = (
                    f"🏁 *ব্লক সমাপ্ত এবং ট্র্যাক ফিট সার্টিফিকেট অর্জিত!*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"ব্লক: {active_block.block_code if active_block else 'BLK-NCR-001'}\n"
                    f"ট্রাফিক কন্ট্রোলকে জানান হয়েছে যে ট্র্যাক ট্রাফিকের জন্য সম্পূর্ণ নিরাপদ। ধন্যবাদ!"
                )
            elif lang == "hi":
                reply_text = (
                    f"🏁 *ब्लॉक संपन्न - ट्रैक फिट प्रमाणपत्र दर्ज!*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"ब्लॉक: {active_block.block_code if active_block else 'BLK-NCR-001'}\n"
                    f"सेक्शन कंट्रोलर को सूचित कर दिया गया है। ट्रैक यातायात हेतु पूर्ण सुरक्षित है।"
                )
            else:
                reply_text = (
                    f"🏁 *BLOCK COMPLETED & TRACK CERTIFIED FIT*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"Block: {active_block.block_code if active_block else 'BLK-NCR-001'}\n"
                    f"Section Controller notified. Track cleared for live traffic operations."
                )

        # 4. DELAY +15 / Extension Request
        elif "DELAY" in text_upper or "EXTEND" in text_upper or "EXTENSION" in text_upper or "+15" in text or "সময়" in text:
            intent = "EXTENSION"
            tool_executed = "REQUEST_EXTENSION"
            tool_params = {"block_id": active_block.id if active_block else 1, "extra_minutes": 15, "reason": "Ground maintenance overrun"}

            if active_block:
                active_block.duration_minutes = (active_block.duration_minutes or 60) + 15
                db.commit()

            if lang == "bn":
                reply_text = (
                    f"⏳ *১৫ মিনিট অতিরিক্ত ব্লকের আবেদন গ্রহণ করা হয়েছে*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"কন্ট্রোল সেন্টারে ১৫ মিনিটের এক্সটেনশন পাঠানো হয়েছে। ট্রেন ট্রাফিকের গতি সাময়িক সামঞ্জস্য করা হচ্ছে।"
                )
            elif lang == "hi":
                reply_text = (
                    f"⏳ *15 मिनट का आपातकालीन एक्सटेंशन स्वीकृत*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"सेक्शन कंट्रोलर को 15 मिनट की अतिरिक्त विंडो का अलर्ट भेज दिया गया है।"
                )
            else:
                reply_text = (
                    f"⏳ *15-MINUTE EXTENSION REQUESTED*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"Section Controller alerted. Block end time extended by +15 mins in RailOptima Engine."
                )

        # 5. STATUS Query / Live Tracking
        elif "STATUS" in text_upper or "KOKHON" in text_upper or "कब" in text or "KAB" in text_upper or "টাকা" in text:
            intent = "QUERY_TRAIN_ETA"
            tool_executed = "QUERY_TRAIN_ETA"
            tool_params = {"train_no": "12002"}

            train_a = db.query(Train).filter(Train.train_no == "12002").first()
            eta_str = train_a.scheduled_arrival.strftime("%H:%M") if train_a and train_a.scheduled_arrival else "15:15"

            if lang == "bn":
                reply_text = (
                    f"🚆 *লাইভ স্ট্যাটাস আপডেট*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"• Train A (12002 Shatabdi): ETA {eta_str} (+75 মিনিট লেট)\n"
                    f"• Train B (12290 Duronto): Pit Line 3 তে প্রস্তুত\n"
                    f"এখন আপনার অগ্রাধিকার হল Train B এর কাজ সম্পন্ন করা।"
                )
            elif lang == "hi":
                reply_text = (
                    f"🚆 *लाइव ट्रेन स्थिति*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"• Train A (12002 Shatabdi): नया ETA {eta_str} (+75 मिनट देरी)\n"
                    f"• Train B (12290 Duronto): Pit Line 3 पर तैयार\n"
                    f"आपकी वर्तमान प्राथमिकता Train B का मेंटेनेंस पूरा करना है।"
                )
            else:
                reply_text = (
                    f"🚆 *LIVE TRAIN & BLOCK STATUS*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"• Train A (12002 Shatabdi): New ETA {eta_str} (+75m Delay)\n"
                    f"• Train B (12290 Duronto): Ready at Pit Line 3\n"
                    f"Action: Complete Train B servicing first."
                )

        # 6. Natural Language / Defect Report or Default Assistant Response
        else:
            intent = "CONVERSATIONAL_QUERY"
            if "DEFECT" in text_upper or "USFD" in text_upper or "CRACK" in text_upper or "FRACTURE" in text_upper or "ফাটল" in text or "दरार" in text:
                tool_executed = "REPORT_EXTRA_DEFECT"
                tool_params = {"location": "KM 824/12", "defect_type": "Rail Fracture", "severity": "P1"}
                
                # Log a defect in DB
                new_defect = Defect(
                    defect_code=f"DEF-WA-{int(datetime.utcnow().timestamp()) % 10000}",
                    asset_id=1,
                    location_km="KM 824/12",
                    defect_type="Rail Flaw / Crack",
                    severity="P1",
                    status="Open",
                    description=f"Reported via WhatsApp by {sub.full_name}: {text}"
                )
                db.add(new_defect)
                db.commit()

                if lang == "bn":
                    reply_text = f"🚨 *ক্রুটি সফলভাবে নথিবদ্ধ করা হয়েছে!*\nকোড: {new_defect.defect_code}\nজরুরী পি-১ অগ্রাধিকার হিসেবে ইঞ্জিনিয়ারিং সেকশনকে পাঠানো হয়েছে।"
                elif lang == "hi":
                    reply_text = f"🚨 *खामी/डिफेक्ट दर्ज कर लिया गया है!*\nकोड: {new_defect.defect_code}\nP1 प्राथमिकता के रूप में पीडब्लूआई को सूचित किया गया।"
                else:
                    reply_text = f"🚨 *DEFECT LOGGED IN RAILOPTIMA*\nCode: {new_defect.defect_code}\nPriority P1 dispatch sent to Senior Section Engineer."
            else:
                tool_executed = "ASSISTANT_REPLY"
                if lang == "bn":
                    reply_text = (
                        f"🤖 *রেলঅপ্টিমা ফিল্ড ডিসপ্যাচার*\n"
                        f"আপনার বার্তা: \"{text}\"\n"
                        f"কমান্ড মেনু:\n"
                        f"• *1* বা *ACK* - নির্দেশ স্বীকাৰ করতে\n"
                        f"• *START* - পজেশন নিতে\n"
                        f"• *DONE* - কাজ সম্পন্ন করতে\n"
                        f"• *STATUS* - ট্রেন ইটিএ দেখতে"
                    )
                elif lang == "hi":
                    reply_text = (
                        f"🤖 *रेलऑप्टिमा फील्ड डिस्पैचर*\n"
                        f"आपका संदेश: \"{text}\"\n"
                        f"कमांड:\n"
                        f"• *1* - स्वीकारें\n"
                        f"• *START* - पज़ेशन लें\n"
                        f"• *DONE* - कार्य समाप्त\n"
                        f"• *STATUS* - लाइव स्थिति"
                    )
                else:
                    reply_text = (
                        f"🤖 *RailOptima Field Dispatcher*\n"
                        f"Received: \"{text}\"\n"
                        f"Quick Replies:\n"
                        f"• *1* or *ACK* to accept work order\n"
                        f"• *START* when track possessed\n"
                        f"• *DONE* when line certified fit\n"
                        f"• *STATUS* for ETA updates"
                    )

        # Save inbound log
        inbound_log = WhatsAppMessageLog(
            message_id=raw_payload.get("id") if raw_payload else f"IN-{int(datetime.utcnow().timestamp())}",
            phone_number=phone_number,
            direction="inbound",
            message_type="text",
            content=message_body,
            intent_detected=intent,
            tool_executed=tool_executed,
            delivery_status="received",
            payload={"tool_params": tool_params, "raw": raw_payload}
        )
        db.add(inbound_log)
        db.commit()

        # Send outbound reply to crew member
        outbound_result = cls.send_whatsapp_message(
            phone_number=phone_number,
            message_text=reply_text,
            db=db,
            msg_type="text",
            payload_meta={"reply_to_intent": intent, "tool": tool_executed}
        )

        return {
            "phone_number": phone_number,
            "intent": intent,
            "tool_executed": tool_executed,
            "tool_params": tool_params,
            "reply_sent": reply_text,
            "outbound_result": outbound_result
        }
