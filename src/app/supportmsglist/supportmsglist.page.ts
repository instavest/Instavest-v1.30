import { Component, OnInit, ViewChild } from '@angular/core';
import { NavigationExtras, Router, Route, ActivatedRoute } from '@angular/router';
import { MenuController, IonContent, Platform } from '@ionic/angular';
import { UserService } from '../providers/user.service';

type SupportMsg = { "msg": string, "datetime": string, "SenderId": string, "email": string, "state": string, "canReply": string, "MessageId": string };
type SupportItem = { "supportId": string, "Header": string, "CompanyId": string, "TopicId": number, "SenderId": string, "MemberId": string, "AssignMem": string, "AssignCom": string, "Status": string, "Email": string, "RecStatus": string, "TimeStamp": string, "LastEditBy": string, "ModifyDate": string, "Settings": string, "rate": string, "Extra": string, "UserName": string, "msg": Array<SupportMsg> };
type SupportData = { "MemberId": string, "SupportMsgList": Array<SupportItem> };
type Topics = Array<{ "Name": string, "value": string }>;

@Component({
  selector: 'app-supportmsglist',
  templateUrl: './supportmsglist.page.html',
  styleUrls: ['./supportmsglist.page.scss'],
})

export class SupportmsglistPage implements OnInit {
  @ViewChild('content') content: IonContent;

  public showChatList: boolean = null;
  firstLoad = true;
  supportListData: Array<SupportItem>;
  supportItem: SupportItem;
  topics: Topics;
  memberId: string;
  skeleton:any;
  selectedTopic: number = null;
  sending = false;
  showMessage = false;

  topic: { topicId: number, heading: string, text: string };
  bounceToChat = false;

  showSkeleton = true;

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    public menuCtrl: MenuController,
    public user: UserService,
    public platform: Platform
  ) {
    this.primeSupportListData();
    this.menuCtrl.enable(true, 'main');

    this.route.queryParams.subscribe(params => {
      if (this.router.getCurrentNavigation().extras &&
        this.router.getCurrentNavigation().extras.queryParams) {
        if (this.router.getCurrentNavigation().extras.queryParams.topic) {
          this.topic = this.router.getCurrentNavigation().extras.queryParams.topic;
          this.bounceToChat = true;
        }

        if (this.router.getCurrentNavigation().extras.queryParams.reload) {
          this.loadData();
        }
      }

    });
  }

  ngOnInit(){
    
    setTimeout(() => {
      this.loadData();
    }, 500);

  }

  loadData() {
    this.loadSupportData(this.bounceToChat).then(() => {
      this.showSkeleton = false;
      this.sending = false;
      if (this.bounceToChat) {
        this.openChatFromExternalPage();
      }
    });
  }

  scrollToLatestMsg() {
    if (this.content) {
      this.content.scrollToBottom(200);
    }
  }


  showHelp() {
    console.log("CREATE HELP FILE");
  }

  openchat() {
    this.router.navigate(['supportmsglist']);
    // this.router.dispose();
  }


  startNewChat(): SupportItem {
    return { supportId: "", Header: this.topic.heading, CompanyId: null, TopicId: this.topic.topicId, SenderId: null, MemberId: null, AssignMem: null, AssignCom: null, Status: null, Email: null, RecStatus: null, TimeStamp: null, LastEditBy: null, ModifyDate: null, Settings: null, rate: null, Extra: null, UserName: null, msg: [] };
  }


  async primeSupportListData() {
    this.showSkeleton = true;
    this.bounceToChat = false;
    this.topic = this.topic ? this.topic : { topicId: 0, heading: "", text: "" };
    // this.supportItem = { supportId: "", Header: this.topic.heading, CompanyId: null, TopicId: this.topic.topicId, SenderId: null, MemberId: null, AssignMem: null, AssignCom: null, Status: null, Email: null, RecStatus: null, TimeStamp: null, LastEditBy: null, ModifyDate: null, Settings: null, rate: null, Extra: null, UserName: null, msg: [] };
    this.supportItem = { supportId: "", Header: "", CompanyId: null, TopicId: null, SenderId: null, MemberId: null, AssignMem: null, AssignCom: null, Status: null, Email: null, RecStatus: null, TimeStamp: null, LastEditBy: null, ModifyDate: null, Settings: null, rate: null, Extra: null, UserName: null, msg: [] };
    this.topics = [];
    this.supportListData = null;
    return;
  }

  convertDate(dateStr: string) {
    return Date.parse(dateStr);
  }


  async loadSupportData(loadAll: boolean): Promise<any> {
    if (this.firstLoad) {
      this.firstLoad = false;
    }

    return this.loadMessageData().then(async () => {
      const success = await this.loadTopicsData();
      if (!success) {
        this.user.exitToLoginPage();
      }
    });
  }

  loadTopicsData(): Promise<any> {
    return this.user.getSupportTopics()
      .then(
        async (data) => {
          if (!data || !data.success) {
            // authentication error
            return null;
          }

          this.topics = await data.data;
          return true;
        }, err => {
          // authentication error
          return false;
        });
  }

  loadMessageData(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.syncSupportMessages().then(async response => {

        this.memberId = response.MemberId;

        this.supportListData = await response.SupportMsgList;

        if (!this.supportListData) {
          this.supportListData = [];
          resolve(false);
          return;
        }

        // page called from Customer Support button => show support message list
        this.setShowMessageVar();
        this.scrollToLatestMsg();
        resolve(true);

      }, err => {
        // authentication error
        this.user.exitToLoginPage();
        reject(err);
      });
    });
  }

  syncSupportMessages(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.user.getSupportMessages().then(async (data) => {
        console.log(data);
        if (!data || !data.data) {
          this.user.setToast("We were unable to connect with support. Try sending us a message or email us for assistance (support@instavestcapital.com).");
          resolve(false);
        }

        resolve(data.data);

      }, err => {
        resolve(false);
      });
    });
  }

  setShowMessageVar() {
    this.showMessage = (this.supportListData && this.supportListData.length < 1) ? true : false;
  }

  openChatFromExternalPage() {
    const navigationExtras: NavigationExtras = {
      queryParams: {
        item: this.supportItem,
        topics: this.topics,
        memberId: this.memberId,
        topic: this.topic
      }
    };

    this.router.navigate(['chat-detail'], navigationExtras).then(() => {
      this.primeSupportListData();
      // this.router.dispose();
    });
  }

  open(index: number) {
    let item: SupportItem = null;

    // start a blank chat
    if (index === -1) {
      item = this.startNewChat();
      item.TopicId = 0;
      item.Header = "";
      item.SenderId = this.memberId;
      item.supportId = "";

    } else {
      item = this.supportListData[index];
      this.topic = { topicId: item.TopicId, heading: item.Header, text: "" };
    }

    const navigationExtras: NavigationExtras = {
      queryParams: {
        item,
        topics: this.topics,
        memberId: this.memberId,
        topic: this.topic
      }
    };

    this.router.navigate(['chat-detail'], navigationExtras).then(() => {
      // reset variables for return
      this.primeSupportListData();
    });
  }
}
