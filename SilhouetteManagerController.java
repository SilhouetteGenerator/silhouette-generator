package com.tomorrow.adapter.api.product;

import com.alibaba.fastjson.JSON;
import com.tomorrow.adapter.dto.product.silhouette.SilhouetteQueryRequest;
import com.tomorrow.adapter.dto.product.silhouette.SilhouetteQueryResultDTO;
import com.tomorrow.adapter.dto.product.silhouette.SilhouetteSubmitRequest;
import com.tomorrow.adapter.dto.product.silhouette.SilhouetteSubmitDTO;
import com.tomorrow.adapter.dto.support.Response;
import com.tomorrow.adapter.dto.support.StateCodeEnum;
import com.tomorrow.app.bo.product.silhouette.SilhouetteQueryRequestBO;
import com.tomorrow.app.bo.product.silhouette.SilhouetteQueryResultBO;
import com.tomorrow.app.bo.product.silhouette.SilhouetteSubmitRequestBO;
import com.tomorrow.app.bo.product.silhouette.SilhouetteSubmitBO;
import com.tomorrow.app.service.product.SilhouetteAppService;
import com.tomorrow.infrustructure.converter.product.SilhouetteConverter;
import com.tomorrow.infrustructure.exception.BusinessException;
import com.tomorrow.infrustructure.utils.LogUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.RandomUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 剪影处理管理控制器
 */
@RestController
@RequestMapping("/api/product/silhouette")
public class SilhouetteManagerController {

    @Autowired
    private SilhouetteAppService silhouetteAppService;

    @Autowired
    private SilhouetteConverter silhouetteConverter;

    /**
     * 剪影处理接口 - 提交任务
     */
    @PostMapping("/submit")
    public Response<SilhouetteSubmitDTO> submitTask(@RequestBody SilhouetteSubmitRequest request,
                                                    HttpServletRequest servletRequest) {
//        if (true) {
//            SilhouetteSubmitDTO silhouetteSubmitDTO = new SilhouetteSubmitDTO();
//            silhouetteSubmitDTO.setTaskId("124");
//            return Response.success(silhouetteSubmitDTO);
//        }
        String ipAddress = servletRequest.getHeader("X-Real-IP");
        try {
            // 参数校验
            if (StringUtils.isBlank(request.getImageUrl())) {
                throw new BusinessException(StateCodeEnum.PARAM_ILLEGAL, "imageUrl cannot be empty");
            }

            // 验证detailLevel参数
            if (StringUtils.isNotBlank(request.getDetailLevel()) &&
                    !"normal".equals(request.getDetailLevel()) &&
                    !"enhanced".equals(request.getDetailLevel())) {
                throw new BusinessException(StateCodeEnum.PARAM_ILLEGAL, "detailLevel must be 'normal' or 'enhance'");
            }

            // 如果detailLevel为空，设置默认值为normal
            if (StringUtils.isBlank(request.getDetailLevel())) {
                request.setDetailLevel("normal");
            }

            // 请求转换
            SilhouetteSubmitRequestBO requestBO = silhouetteConverter.convertToSilhouetteRequestBO(request, ipAddress);

            // 调用服务提交剪影任务
            SilhouetteSubmitBO resultBO = silhouetteAppService.submit(requestBO);

            // 结果转换
            SilhouetteSubmitDTO resultDTO = silhouetteConverter.convertToSilhouetteResultDTO(resultBO);

            LogUtil.tagInfoLog("接口请求", "提交任务成功", servletRequest.getRequestURL(), ipAddress,
                    JSON.toJSONString(request), JSON.toJSONString(resultDTO));
            return Response.success(resultDTO);

        } catch (BusinessException e) {
            LogUtil.tagWarnLog("接口请求", "业务异常", e, servletRequest.getRequestURL(), ipAddress,
                    JSON.toJSONString(request));
            return Response.fail(e.getErrCode(), e.getMessage());

        } catch (Exception e) {
            LogUtil.tagErrorLog("接口请求", "系统异常", e, servletRequest.getRequestURL(), ipAddress,
                    JSON.toJSONString(request));
            return Response.fail(StateCodeEnum.SERVER_EXCEPTION, e.getMessage());
        }
    }

    /**
     * 查询剪影处理结果接口
     */
    @PostMapping("/query")
    public Response<SilhouetteQueryResultDTO> query(@RequestBody SilhouetteQueryRequest request,
                                                    HttpServletRequest servletRequest) {
//        if (true) {
//            SilhouetteQueryResultDTO resultDTO = new SilhouetteQueryResultDTO();
//            resultDTO.setStatus("SUCCESS");
//            resultDTO.setProgress("1");
//            resultDTO.setSilhouetteUrl("https://tomorrow-yes.oss-us-west-1.aliyuncs.com/silhouette/a12f03a15eef4b968c9ae083f16a6105.png");
//            return Response.success(resultDTO);
//        }
        String ipAddress = servletRequest.getHeader("X-Real-IP");
        try {
            // 参数校验
            if (StringUtils.isBlank(request.getTaskId())) {
                throw new BusinessException(StateCodeEnum.PARAM_ILLEGAL, "taskId cannot be empty");
            }
            if (request.getSilhouetteRequest() == null) {
                throw new BusinessException(StateCodeEnum.PARAM_ILLEGAL, "silhouetteRequest cannot be null");
            }
            if (StringUtils.isBlank(request.getSilhouetteRequest().getImageUrl())) {
                throw new BusinessException(StateCodeEnum.PARAM_ILLEGAL, "imageUrl cannot be empty");
            }
            if (request.getQueryCount() == null || request.getQueryCount() < 1) {
                throw new BusinessException(StateCodeEnum.PARAM_ILLEGAL, "queryCount must be greater than 0");
            }

            // 请求转换
            SilhouetteQueryRequestBO requestBO = silhouetteConverter.convertToSilhouetteQueryRequestBO(request);

            // 调用服务查询剪影结果
            SilhouetteQueryResultBO resultBO = silhouetteAppService.querySilhouetteResult(requestBO);

            // 结果转换
            SilhouetteQueryResultDTO resultDTO = silhouetteConverter.convertToSilhouetteQueryResultDTO(resultBO);

            LogUtil.tagInfoLog("接口请求", "查询结果成功", servletRequest.getRequestURL(), ipAddress,
                    JSON.toJSONString(request), JSON.toJSONString(resultDTO));
            return Response.success(resultDTO);

        } catch (BusinessException e) {
            LogUtil.tagWarnLog("接口请求", "业务异常", e, servletRequest.getRequestURL(), ipAddress,
                    JSON.toJSONString(request));
            return Response.fail(e.getErrCode(), e.getMessage());

        } catch (Exception e) {
            LogUtil.tagErrorLog("接口请求", "系统异常", e, servletRequest.getRequestURL(), ipAddress,
                    JSON.toJSONString(request));
            return Response.fail(StateCodeEnum.SERVER_EXCEPTION, e.getMessage());
        }
    }
}