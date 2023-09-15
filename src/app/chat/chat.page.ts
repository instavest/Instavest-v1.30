import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, NavigationExtras } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { UserService } from '../providers/user.service';

type SupportMsg = { "msg": string, "datetime": string, "SenderId": string, "email": string, "state": number, "canReply": number, "MessageId": number };
type SupportItem = { "supportId": string, "Header": string, "CompanyId": string, "TopicId": number, "SenderId": string, "MemberId": string, "AssignMem": string, "AssignCom": string, "Status": string, "Email": string, "RecStatus": string, "TimeStamp": string, "LastEditBy": string, "ModifyDate": string, "Settings": string, "rate": string, "Extra": string, "UserName": string, "msg": Array<SupportMsg> };
type Topics = Array<{ "Name": string, "value": string, "selected"?: boolean }>;
type MsgItem = { "msg": string, "datetime": string, "SenderId": string, "email": string, "state": number, "canReply": number, "MessageId": number };
type QueryParams = { item: SupportItem, topics: Topics, memberId: string };
type SupportData = { "MemberId": string, "SupportMsgList": Array<SupportItem> };

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage {
  @ViewChild('content') content: IonContent;

  supportItem: SupportItem;
  topics: Topics;

  message: string;
  topic: { topicId: number, heading: string, text: string };

  showTopics = false;

  numSelects = 0;

  canReply = true;
  memberId = "-1";
  canSend = false;

  supportMsgList: Array<SupportItem>;
  sending = false;

  requestReload = false;

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public user: UserService
  ) {

    this.route.queryParams.subscribe(params => {
      if (this.router.getCurrentNavigation() && this.router.getCurrentNavigation().extras.queryParams) {
        this.supportItem = this.router.getCurrentNavigation().extras.queryParams.item;
        this.topics = this.router.getCurrentNavigation().extras.queryParams.topics;
        this.memberId = this.router.getCurrentNavigation().extras.queryParams.memberId;
        this.topic = this.router.getCurrentNavigation().extras.queryParams.topic;

        this.setSupportTopicIndex();

        this.setParams();

        if (this.topic.topicId > 0) {
          this.canSend = true;
        }
      }
    });
  }

  close() {
    const navigationExtras: NavigationExtras = {
      queryParams: {
        reload: true
      }
    };
    this.router.navigate(['supportmsglist'], navigationExtras);
  }

  setSupportTopicIndex(skipIndex?: number) {
    let i = 0;
    this.topics.forEach(element => {
      if (skipIndex !== undefined && skipIndex !== i) {
        element.selected = false;
      }
      ++i;
    });
  }

  setParams() {
    this.requestReload = false;
    if (this.supportItem.supportId === "") { // new support message
      if (this.supportItem.msg.length > 0 || this.supportItem.TopicId > 0) {
        this.showTopics = false;
      } else {
        this.topic.heading = "Instavest Support";
        this.topic.text = "Start by choosing a support topic from those listed below, then type and send your message. You will be alerted once we've responded to your message.";
        this.showTopics = true;
      }
    }
    if (this.supportItem.msg && this.supportItem.msg.length > 0) {
      this.canReply = (this.supportItem.msg[0].canReply === 1) ? true : false; // can reply the same for all messages in this array
    }
  }

  convertDate(dateStr: string) {
    return Date.parse(dateStr);
  }

  primeSupportItemData() {
    this.numSelects = 0;
    this.topic = { topicId: 0, heading: "", text: "" };
    this.supportItem = { supportId: "", Header: this.topic.heading, CompanyId: "", TopicId: this.topic.topicId, SenderId: "", MemberId: "", AssignMem: "", AssignCom: "", Status: "", Email: "", RecStatus: "", TimeStamp: "", LastEditBy: "", ModifyDate: "", Settings: "", rate: "", Extra: "", UserName: "", msg: [{ msg: "", datetime: "", SenderId: "", email: "", state: 0, canReply: 1, MessageId: 0 }] };
    return;
  }


  async send() {
    if (!this.message) {
      return false;
    }

    const supportId = this.supportItem.supportId === "-1" ? "" : this.supportItem.supportId;

    this.sending = true;

    this.user.sendSupportMessage(supportId, this.topic.heading, this.message, this.topic.topicId).then(async (response) => {

      if (!response) {
        this.user.exitToLoginPage();
        return false;
      }

      if (!response.success) {
        this.user.setToast("Your message to support couldn't be sent. Please try again or email us (support@instavestcapital.com).");
        return;
      }

      this.supportItem.supportId = await response.data.id;

    }, err => {
      this.sending = false;
      this.user.setToast("Your message to support couldn't be sent. Please try again or email us (support@instavestcapital.com).");
    }).then(() => {
      this.syncSupportMessages().then((data) => {
        this.sending = false;

        if (data) {
          this.updateSupportItem(data).then(() => {
            this.message = "";
            this.showTopics = false;
            this.topic.text = "";
            this.scrollToLatestMsg();
          });
        }
      });
    }, err => {
      this.sending = false;
    });
  }


  updateSupportItem(data): Promise<any> {

    const msgList: Array<SupportItem> = data.SupportMsgList;
    console.log("msgList:");
    console.log(msgList);

    return new Promise((resolve, reject) => {
      if (!msgList) {
        this.supportMsgList = [];
        console.log(data);
        resolve(false);
      }

      this.supportMsgList = msgList;

      try {
        this.supportMsgList.forEach(element => {
          console.log("element.supportId = " + element.supportId + "vs this.supportId = " + this.supportItem.supportId);
          if (element.supportId === this.supportItem.supportId) {
            this.supportItem = element;
            console.log("this.supportItem");
            console.log(this.supportItem);
            resolve(true);
            return;
            // throw BREAK_EXCEPTION;
          }
        });
      } catch (e) { console.log("reached break"); return; }
      resolve(false);
    });
  }



  syncSupportMessages(): Promise<any> {

    return new Promise((resolve, reject) => {
      this.user.getSupportMessages().then(async (data) => {

        if (data && data.data) {
          resolve(data.data);
        }
      }, err => {
        resolve(false);
      });
    });
  }



  addMessageToList(msg?: string, isUser?: boolean) {
    const message = msg ? msg : null;

    let senderId = "-1"; // Not the user

    if (isUser) {
      senderId = this.memberId;
    }

    this.supportItem.msg.push(
      {
        msg: message,
        datetime: "now",
        SenderId: senderId,
        email: "",
        state: 0,
        canReply: 1,
        MessageId: this.supportItem.msg.length + 1
      }
    );

    console.log(this.supportItem.msg);


    this.scrollToLatestMsg();

    return;

  }

  scrollToLatestMsg() {
    if (this.content) {
      this.content.scrollToBottom();
    }
  }


  getFriendlyString(supporttopicid: number) {
    switch (supporttopicid) {
      case 1: {
        return "technical support";
      }
      case 2: {
        return "investor support";
      }
      case 3: {
        return "customer support";
      }
      case 4: {
        return "general enquiries";
      }
      default:
        return "customer support";
    }
  }


  setTopic(index: number, Name: string, value: string) {
    if (this.topic.topicId === +value) { return; }

    ++this.numSelects;
    this.setSelectedIndex(index);
    this.topic.heading = Name;
    this.topic.topicId = +value;

    setTimeout(() => {
      this.addMessageToList(this.getResponseMsg());
      this.canSend = true;
    }, 500);
  }


  getResponseMsg(): string {
    switch (this.numSelects) {
      case 1:
        return "Thank you. You can now send a message and a member of our support team will tend to your enquiry.";
      case 2:
        return "We've changed the support topic to " + this.topic.heading + ". You can now go ahead and send a message to our support team.";
      case 3:
        return "Support topic updated to " + this.topic.heading + ". Got any queries on this topic?";
      case 4:
        return "Haha... having a little tapping party on the support page, are we? ;-)";
      default: return "Instavest support standing by...";
    }
  }

  setSelectedIndex(index: number) {
    this.topics[index].selected = true;
    this.setSupportTopicIndex(index);
  }


}
