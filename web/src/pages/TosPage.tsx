import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TosPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-4 px-6 md:px-8 max-w-7xl">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          返回上一页
        </Button>
      </div>
      <div className="w-full rounded-md border bg-card text-card-foreground p-5 sm:p-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight lg:text-3xl">
          Lucky Bot 服务条款
        </h1>
        <p className="text-base text-muted-foreground mt-2">
          最后更新：2026 年 2 月 15 日
        </p>
        <p className="text-base leading-relaxed mt-4">
          本服务条款适用于 Lucky Bot Telegram
          机器人、相关网页界面以及其提供的全部功能与服务（以下统称“本平台”）。用户通过访问、使用、创建抽奖活动、参与抽奖活动或以任何方式使用本平台，即表示其已充分阅读、理解并同意接受本条款的全部内容。本条款构成用户与本平台之间具有法律约束力的电子协议。如用户不同意本条款的任何内容，应立即停止使用本平台。
        </p>

        <h2 className="mt-8 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0">
          第一条 平台性质与服务范围
        </h2>
        <p className="text-base leading-relaxed mt-4">
          本平台系提供自动化抽奖技术工具的信息服务系统，其功能仅限于为用户提供抽奖活动的创建、规则设置、参与记录统计、随机抽取计算、结果生成及页面展示等技术支持服务。本平台不对任何抽奖活动进行实质审查、批准或认证，也不参与活动的组织、运营、资金流转、奖品采购、物流配送、履约安排或争议处理。
        </p>
        <p className="text-base leading-relaxed mt-4">
          用户理解并同意，本平台在任何情况下均不构成抽奖活动的主办方、承诺方、担保方、代理方、中介方、受托方或仲裁机构。所有抽奖活动均由活动发起人自行发布并独立管理，相关法律责任应由活动发起人自行承担，本平台仅提供技术支持服务。
        </p>

        <h2 className="mt-8 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0">
          第二条 抽奖内容与结果责任限制
        </h2>
        <p className="text-base leading-relaxed mt-4">
          抽奖活动中涉及的全部信息，包括但不限于奖品描述、数量、价值、图片展示、规则说明、参与条件、开奖方式、兑奖流程及相关承诺，均由活动发起人自行提供并负责。本平台不对上述信息的真实性、合法性、完整性、准确性、可靠性或履约能力进行审查、核验或保证，也不对任何虚假陈述、误导性信息或信息遗漏承担责任。
        </p>
        <p className="text-base leading-relaxed mt-4">
          本平台所生成的抽奖结果仅为基于既定规则运行算法后产生的程序性随机输出，其仅代表系统计算结果，并不代表奖品真实存在、已经发放或必然可以兑现。用户理解并同意，对于因奖品不存在、履约违约、延迟发放、虚假抽奖、诈骗行为或其他纠纷所产生的一切损失，本平台不承担任何责任，相关争议应由参与者与活动发起人自行解决。
        </p>

        <h2 className="mt-8 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0">
          第三条 用户义务与责任承担
        </h2>
        <p className="text-base leading-relaxed mt-4">
          用户在使用本平台时，应遵守适用法律法规及互联网规范，并保证其发布、展示或传播的任何信息均真实、合法且不侵犯第三方合法权益。用户不得利用本平台从事任何违法活动，包括但不限于诈骗、赌博或变相赌博、非法集资、虚假宣传、侵犯知识产权或扰乱网络秩序的行为，也不得通过技术手段干扰平台运行或非法获取平台数据。
        </p>
        <p className="text-base leading-relaxed mt-4">
          如因用户行为导致本平台遭受任何索赔、行政处罚、诉讼或经济损失，用户应承担全部法律责任，并赔偿本平台因此产生的全部损失，包括合理的律师费用、调查费用及维权支出。
        </p>

        <h2 className="mt-8 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0">
          第四条 数据记录与证据效力
        </h2>
        <p className="text-base leading-relaxed mt-4">
          本平台所生成、存储或展示的任何数据、记录、页面信息、抽奖结果、日志、截图或电子信息，仅用于娱乐和信息展示用途，其内容不保证具备完整性、连续性、不可篡改性或长期保存性。用户明确同意，上述数据不得作为司法证据、行政执法依据或任何法律证明材料使用，本平台亦不提供电子存证、取证或认证服务。
        </p>

        <h2 className="mt-8 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0">
          第五条 服务提供方式与责任限制
        </h2>
        <p className="text-base leading-relaxed mt-4">
          本平台按照“现状”和“可用性”提供服务，不对服务的持续性、稳定性、安全性或无错误运行作出保证。由于网络环境变化、第三方平台限制、系统维护、技术故障、数据传输异常或不可抗力等原因，可能导致服务中断、延迟或数据异常，用户对此应予以理解并自行承担风险。
        </p>
        <p className="text-base leading-relaxed mt-4">
          在法律允许的最大范围内，本平台不对因使用或无法使用本平台所产生的任何直接或间接损失承担责任，包括但不限于财产损失、交易损失、数据丢失、商业利益损失或纠纷损失。本平台有权根据运营需要随时调整、暂停或终止部分或全部服务功能。
        </p>

        <h2 className="mt-8 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0">
          第六条 不可抗力
        </h2>
        <p className="text-base leading-relaxed mt-4">
          如因不可抗力事件导致本平台无法履行或延迟履行义务，本平台不承担责任。不可抗力包括但不限于自然灾害、战争、政府行为、网络攻击、通信故障、技术系统崩溃或第三方服务中断。
        </p>

        <h2 className="mt-8 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0">
          第七条 条款变更
        </h2>
        <p className="text-base leading-relaxed mt-4">
          本平台有权根据法律法规变化或运营需要对本条款进行修改。修改后的条款自发布之日起生效，用户继续使用本平台即视为接受更新后的条款。
        </p>

        <h2 className="mt-8 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0">
          第八条 法律适用与争议解决
        </h2>
        <p className="text-base leading-relaxed mt-4">
          本条款的订立、执行及解释均适用中华人民共和国法律。因使用本平台或与本条款有关的一切争议，双方应首先友好协商解决；协商不成的，任何一方均应向本平台运营主体所在地有管辖权的人民法院提起诉讼。
        </p>

        <h2 className="mt-8 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0">
          第九条 条款效力
        </h2>
        <p className="text-base leading-relaxed mt-4">
          如本条款中的任何条款被认定为无效、违法或不可执行，该条款应在必要范围内进行调整或视为删除，但不影响其他条款的效力，其余条款仍应保持完全有效并继续执行。
        </p>

        <h2 className="mt-8 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0">
          第十条 其他
        </h2>
        <p className="text-base leading-relaxed mt-4">
          本条款构成用户与本平台之间关于使用本平台服务的完整协议，用户确认已充分理解本条款的全部内容及其法律后果。本条款未尽事宜，依照相关法律法规执行。
        </p>
      </div>
    </div>
  );
}
